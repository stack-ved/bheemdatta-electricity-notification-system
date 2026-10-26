alter table public.profiles
  add column if not exists permanent_address_status text;

drop trigger if exists enforce_resident_profile_data on public.profiles;

update public.profiles p
set permanent_address_status = case
  when nullif(btrim(p.permanent_address), '') is not null
    and p.ward_number between 1 and 19
    and exists (
      select 1 from public.wards w
      where w.municipality_id = p.municipality_id
        and w.ward_number = p.ward_number
    ) then 'verified'
  else 'verification_required'
end
where p.permanent_address_status is null;

alter table public.profiles
  alter column permanent_address_status set default 'verification_required',
  alter column permanent_address_status set not null;

alter table public.profiles
  drop constraint if exists profiles_permanent_address_status_check;
alter table public.profiles
  add constraint profiles_permanent_address_status_check
  check (permanent_address_status in ('verified', 'verification_required'));

alter table public.electricity_notices
  add column if not exists municipality_id uuid references public.municipalities(id);

update public.electricity_notices n
set municipality_id = (
  select m.id from public.municipalities m
  where lower(m.name_en) = lower('Bheemdatta Municipality')
  order by m.created_at
  limit 1
)
where n.municipality_id is null
  and exists (
    select 1 from public.municipalities m
    where lower(m.name_en) = lower('Bheemdatta Municipality')
  );

create or replace function public.validate_electricity_notice_target()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.municipality_id is null then
    select id into new.municipality_id
    from public.municipalities
    where lower(name_en) = lower('Bheemdatta Municipality')
    order by created_at
    limit 1;
  end if;

  if new.municipality_id is null then
    raise exception 'Electricity notice municipality is required.';
  end if;

  if new.ward_number = 0 then
    return new;
  end if;

  if new.ward_number is null or new.ward_number < 1 or new.ward_number > 19
    or not exists (
      select 1 from public.wards w
      where w.municipality_id = new.municipality_id
        and w.ward_number = new.ward_number
    ) then
    raise exception 'Electricity notice ward is not valid for its municipality.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_electricity_notice_target on public.electricity_notices;
create trigger validate_electricity_notice_target
before insert or update of municipality_id, ward_number on public.electricity_notices
for each row execute function public.validate_electricity_notice_target();

create table if not exists public.address_correction_requests (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id),
  old_ward_number integer,
  old_address text,
  new_ward_number integer not null check (new_ward_number between 1 and 19),
  new_address text not null check (length(btrim(new_address)) between 3 and 300),
  resident_reason text not null check (length(btrim(resident_reason)) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_reason text,
  approved_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists address_correction_one_pending_per_resident
  on public.address_correction_requests (resident_id)
  where status = 'pending';

create index if not exists address_correction_requests_status_created_idx
  on public.address_correction_requests (status, created_at);

create table if not exists public.address_correction_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.address_correction_requests(id),
  resident_id uuid not null references public.profiles(id),
  municipality_id uuid not null references public.municipalities(id),
  old_ward_number integer,
  new_ward_number integer not null,
  old_address text,
  new_address text not null,
  approved_by uuid not null references public.profiles(id),
  reason text not null,
  changed_at timestamptz not null default now()
);

alter table public.address_correction_requests enable row level security;
alter table public.address_correction_audit enable row level security;

revoke all on public.address_correction_requests from anon, authenticated;
revoke all on public.address_correction_audit from anon, authenticated;
grant select on public.address_correction_requests to authenticated;
grant select on public.address_correction_audit to authenticated;

drop policy if exists "Residents and admins can view address correction requests" on public.address_correction_requests;
create policy "Residents and admins can view address correction requests"
on public.address_correction_requests for select
using (
  resident_id = auth.uid()
  or exists (
    select 1 from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'municipality_admin'
      and actor.is_active is true
  )
);

drop policy if exists "Residents and admins can view address correction audit" on public.address_correction_audit;
create policy "Residents and admins can view address correction audit"
on public.address_correction_audit for select
using (
  resident_id = auth.uid()
  or exists (
    select 1 from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'municipality_admin'
      and actor.is_active is true
  )
);

create or replace function public.validate_resident_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and current_user <> 'postgres' then
    if new.role is distinct from old.role
      or new.municipality_id is distinct from old.municipality_id
      or new.ward_id is distinct from old.ward_id
      or new.ward_number is distinct from old.ward_number
      or new.permanent_address is distinct from old.permanent_address
      or new.permanent_address_status is distinct from old.permanent_address_status then
      raise exception 'Permanent address, ward, municipality, and role can only be changed through an authorized municipality correction.';
    end if;
  end if;

  if new.role = 'resident' and new.permanent_address_status = 'verified' then
    if new.municipality_id is null
      or new.ward_number is null
      or new.ward_number < 1
      or new.ward_number > 19
      or nullif(btrim(new.permanent_address), '') is null
      or length(btrim(new.permanent_address)) < 3
      or length(btrim(new.permanent_address)) > 300 then
      raise exception 'A verified resident address requires a municipality, valid ward, and permanent address.';
    end if;

    if not exists (
      select 1 from public.wards w
      where w.municipality_id = new.municipality_id
        and w.ward_number = new.ward_number
    ) then
      raise exception 'The selected ward does not belong to the selected municipality.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_resident_profile_data on public.profiles;
create trigger enforce_resident_profile_data
before insert or update on public.profiles
for each row execute function public.validate_resident_profile();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  municipality_uuid uuid;
  numeric_ward integer;
  address_text text;
begin
  if coalesce(new.raw_user_meta_data ->> 'role', 'resident') <> 'resident' then
    raise exception 'New accounts can only register as residents.';
  end if;

  if new.raw_user_meta_data ->> 'permanent_address_confirmed' is distinct from 'true' then
    raise exception 'Permanent residential address confirmation is required.';
  end if;

  begin
    municipality_uuid := (new.raw_user_meta_data ->> 'municipality_id')::uuid;
    numeric_ward := (new.raw_user_meta_data ->> 'ward_number')::integer;
  exception when others then
    raise exception 'A valid municipality and explicitly selected ward are required.';
  end;

  address_text := nullif(btrim(new.raw_user_meta_data ->> 'permanent_address'), '');
  if address_text is null or length(address_text) < 3 or length(address_text) > 300 then
    raise exception 'Permanent residential address must contain between 3 and 300 characters.';
  end if;

  if numeric_ward is null or numeric_ward < 1 or numeric_ward > 19 then
    raise exception 'Ward must be explicitly selected between 1 and 19.';
  end if;

  if not exists (
    select 1 from public.municipalities m
    where m.id = municipality_uuid
      and lower(m.name_en) = lower('Bheemdatta Municipality')
  ) then
    raise exception 'Registration is limited to Bheemdatta Municipality.';
  end if;

  if not exists (
    select 1 from public.wards w
    where w.municipality_id = municipality_uuid
      and w.ward_number = numeric_ward
  ) then
    raise exception 'The selected ward does not belong to Bheemdatta Municipality.';
  end if;

  insert into public.profiles (
    id, full_name, phone, municipality_id, ward_number, permanent_address,
    permanent_address_status, role, created_at, updated_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Resident'),
    new.raw_user_meta_data ->> 'phone_number',
    municipality_uuid,
    numeric_ward,
    address_text,
    'verified',
    'resident',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop policy if exists "Users can update their own profiles without changing role" on public.profiles;
drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

create or replace function public.request_address_correction(
  p_new_ward integer,
  p_new_address text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resident public.profiles%rowtype;
  request_uuid uuid;
begin
  select * into resident
  from public.profiles
  where id = auth.uid()
  for update;

  if resident.id is null or resident.role <> 'resident' or resident.is_active is not true then
    raise exception 'Only an active resident can request an address correction.';
  end if;

  if p_new_ward is null or p_new_ward < 1 or p_new_ward > 19
    or nullif(btrim(p_new_address), '') is null
    or length(btrim(p_new_address)) < 3
    or length(btrim(p_new_address)) > 300
    or nullif(btrim(p_reason), '') is null
    or length(btrim(p_reason)) > 1000 then
    raise exception 'A valid ward, permanent address, and correction reason are required.';
  end if;

  if resident.municipality_id is null or not exists (
    select 1 from public.wards w
    where w.municipality_id = resident.municipality_id
      and w.ward_number = p_new_ward
  ) then
    raise exception 'The requested ward does not belong to your municipality.';
  end if;

  if resident.ward_number = p_new_ward
    and lower(btrim(coalesce(resident.permanent_address, ''))) = lower(btrim(p_new_address)) then
    raise exception 'The requested address is unchanged.';
  end if;

  insert into public.address_correction_requests (
    resident_id, municipality_id, old_ward_number, old_address,
    new_ward_number, new_address, resident_reason
  ) values (
    resident.id, resident.municipality_id, resident.ward_number, resident.permanent_address,
    p_new_ward, btrim(p_new_address), btrim(p_reason)
  ) returning id into request_uuid;

  return request_uuid;
end;
$$;

create or replace function public.approve_address_correction(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  correction public.address_correction_requests%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active municipality administrator can approve address corrections.';
  end if;

  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'An administrator approval reason is required.';
  end if;

  select * into correction
  from public.address_correction_requests
  where id = p_request_id
  for update;

  if correction.id is null or correction.status <> 'pending' then
    raise exception 'Pending address correction request not found.';
  end if;

  if not exists (
    select 1 from public.wards w
    where w.municipality_id = correction.municipality_id
      and w.ward_number = correction.new_ward_number
  ) then
    raise exception 'The requested ward is not valid for the resident municipality.';
  end if;

  update public.profiles
  set ward_number = correction.new_ward_number,
      permanent_address = correction.new_address,
      permanent_address_status = 'verified',
      updated_at = now()
  where id = correction.resident_id
    and municipality_id = correction.municipality_id
    and role = 'resident';

  if not found then
    raise exception 'Resident profile no longer matches the correction request.';
  end if;

  update public.address_correction_requests
  set status = 'approved', approved_by = actor.id,
      decision_reason = btrim(p_reason), reviewed_at = now()
  where id = correction.id;

  insert into public.address_correction_audit (
    request_id, resident_id, municipality_id, old_ward_number, new_ward_number,
    old_address, new_address, approved_by, reason
  ) values (
    correction.id, correction.resident_id, correction.municipality_id,
    correction.old_ward_number, correction.new_ward_number,
    correction.old_address, correction.new_address, actor.id, btrim(p_reason)
  );
end;
$$;

create or replace function public.reject_address_correction(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active municipality administrator can review address corrections.';
  end if;

  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'A decision reason is required.';
  end if;

  update public.address_correction_requests
  set status = 'rejected', approved_by = actor.id,
      decision_reason = btrim(p_reason), reviewed_at = now()
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'Pending address correction request not found.';
  end if;
end;
$$;

revoke execute on function public.request_address_correction(integer, text, text) from public, anon;
revoke execute on function public.approve_address_correction(uuid, text) from public, anon;
revoke execute on function public.reject_address_correction(uuid, text) from public, anon;
grant execute on function public.request_address_correction(integer, text, text) to authenticated;
grant execute on function public.approve_address_correction(uuid, text) to authenticated;
grant execute on function public.reject_address_correction(uuid, text) to authenticated;

create or replace function public.publish_electricity_notice(p_notice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_row public.electricity_notices%rowtype;
  actor public.profiles%rowtype;
  recipient_count integer := 0;
  target_municipality uuid;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active Municipality Administrator can publish notices';
  end if;

  select * into notice_row from public.electricity_notices where id = p_notice_id for update;
  if not found then raise exception 'Notice not found'; end if;
  if notice_row.publish_at is not null then
    return jsonb_build_object('published', false, 'recipient_count', 0);
  end if;

  select coalesce(notice_row.municipality_id, m.id) into target_municipality
  from public.municipalities m
  where lower(m.name_en) = lower('Bheemdatta Municipality')
  order by m.created_at
  limit 1;
  if target_municipality is null then raise exception 'Notice municipality is not configured.'; end if;

  update public.electricity_notices set publish_at = now(), updated_at = now() where id = p_notice_id;

  insert into public.notifications (user_id, title, message, notification_type, related_notice_id, ward_number)
  select p.id, notice_row.title, notice_row.message, notice_row.notice_type,
         notice_row.id, coalesce(notice_row.ward_number, 0)
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.role = 'resident' and p.is_active is true
    and p.municipality_id = target_municipality
    and coalesce(np.website_notifications, true)
    and (
      notice_row.ward_number = 0
      or (
        notice_row.ward_number between 1 and 19
        and p.permanent_address_status = 'verified'
        and nullif(btrim(p.permanent_address), '') is not null
        and p.ward_number = notice_row.ward_number
        and exists (select 1 from public.wards w where w.municipality_id = p.municipality_id and w.ward_number = p.ward_number)
        and not exists (select 1 from public.address_correction_requests r where r.resident_id = p.id and r.status = 'pending')
      )
    )
  on conflict do nothing;

  get diagnostics recipient_count = row_count;
  return jsonb_build_object('published', true, 'recipient_count', recipient_count);
end;
$$;

create or replace function public.publish_outage_notifications(p_outage_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  outage_row public.outages%rowtype;
  actor public.profiles%rowtype;
  recipient_count integer := 0;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active Municipality Administrator can publish outages';
  end if;

  select * into outage_row from public.outages where id = p_outage_id;
  if not found then raise exception 'Outage notice not found'; end if;

  insert into public.notifications (user_id, title, message, notification_type, related_outage_id, ward_number)
  select p.id,
         coalesce(outage_row.title_en, 'Electricity Alert'),
         coalesce(outage_row.reason_en, 'An electricity outage notice has been issued.'),
         lower(coalesce(outage_row.status, 'outage')),
         outage_row.id,
         case when outage_row.is_municipality_wide is true then 0 else outage_row.ward_number end
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.role = 'resident' and p.is_active is true
    and p.municipality_id = outage_row.municipality_id
    and coalesce(np.website_notifications, true)
    and (
      outage_row.is_municipality_wide is true
      or (
        p.permanent_address_status = 'verified'
        and nullif(btrim(p.permanent_address), '') is not null
        and p.ward_number between 1 and 19
        and exists (select 1 from public.wards w where w.municipality_id = p.municipality_id and w.ward_number = p.ward_number)
        and not exists (select 1 from public.address_correction_requests r where r.resident_id = p.id and r.status = 'pending')
        and p.ward_number in (
          select ow.ward_number from public.outage_wards ow where ow.outage_id = p_outage_id
          union select outage_row.ward_number where outage_row.ward_number is not null
        )
      )
    )
  on conflict do nothing;

  get diagnostics recipient_count = row_count;

  insert into public.notification_deliveries (outage_id, user_id, channel, status, sent_at)
  select outage_row.id, p.id, 'in_app', 'sent', now()
  from public.profiles p
  where p.role = 'resident' and p.is_active is true
    and p.municipality_id = outage_row.municipality_id
    and (
      outage_row.is_municipality_wide is true
      or (
        p.permanent_address_status = 'verified'
        and p.ward_number between 1 and 19
        and exists (select 1 from public.wards w where w.municipality_id = p.municipality_id and w.ward_number = p.ward_number)
        and not exists (select 1 from public.address_correction_requests r where r.resident_id = p.id and r.status = 'pending')
        and p.ward_number in (
          select ow.ward_number from public.outage_wards ow where ow.outage_id = p_outage_id
          union select outage_row.ward_number where outage_row.ward_number is not null
        )
      )
    )
  on conflict (outage_id, user_id, channel) do update set sent_at = now(), status = 'sent';

  return jsonb_build_object('published', true, 'recipient_count', recipient_count);
end;
$$;

drop policy if exists "Users can see outages" on public.outages;
create policy "Users can see outages"
on public.outages for select
using (
  auth.uid() is null
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'municipality_admin'
        or (
          p.municipality_id = outages.municipality_id
          and (
            outages.is_municipality_wide is true
            or (
              p.permanent_address_status = 'verified'
              and p.ward_number between 1 and 19
              and exists (select 1 from public.wards w where w.municipality_id = p.municipality_id and w.ward_number = p.ward_number)
              and not exists (select 1 from public.address_correction_requests r where r.resident_id = p.id and r.status = 'pending')
              and (
                p.ward_number = outages.ward_number
                or exists (select 1 from public.outage_wards ow where ow.outage_id = outages.id and ow.ward_number = p.ward_number)
              )
            )
          )
        )
      )
  )
);

drop policy if exists "Residents can view published ward notices" on public.electricity_notices;
create policy "Residents can view published ward notices"
on public.electricity_notices for select
using (
  status <> 'cancelled'
  and (publish_at is null or publish_at <= now())
  and (
    auth.uid() is null
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'municipality_admin'
          or (
            p.municipality_id = electricity_notices.municipality_id
            and (
              electricity_notices.ward_number = 0
              or (
                electricity_notices.ward_number = p.ward_number
                and p.permanent_address_status = 'verified'
                and p.ward_number between 1 and 19
                and exists (select 1 from public.wards w where w.municipality_id = p.municipality_id and w.ward_number = p.ward_number)
                and not exists (select 1 from public.address_correction_requests r where r.resident_id = p.id and r.status = 'pending')
              )
            )
          )
        )
    )
  )
);