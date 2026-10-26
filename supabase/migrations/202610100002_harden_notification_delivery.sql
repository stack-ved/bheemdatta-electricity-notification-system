alter table public.outages
  add column if not exists notification_published_at timestamptz;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;
alter table public.notification_deliveries
  add constraint notification_deliveries_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped'));

create or replace function public.validate_outage_ward_mapping()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.municipality_id is null or not exists (
    select 1 from public.municipalities m where m.id = new.municipality_id
  ) then
    raise exception 'Outage municipality is required and must exist.';
  end if;

  if new.ward_number is not null and not exists (
    select 1 from public.wards w
    where w.municipality_id = new.municipality_id
      and w.ward_number = new.ward_number
      and w.ward_number between 1 and 19
  ) then
    raise exception 'Outage ward does not belong to its municipality.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_outage_ward_mapping on public.outages;
create trigger validate_outage_ward_mapping
before insert or update on public.outages
for each row execute function public.validate_outage_ward_mapping();

create or replace function public.protect_outage_publication_marker()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'postgres'
    and new.notification_published_at is distinct from old.notification_published_at then
    raise exception 'Outage publication state can only be changed through the publishing RPC.';
  end if;
  if tg_op = 'INSERT' and current_user <> 'postgres' and new.notification_published_at is not null then
    raise exception 'Outage publication state is managed by the publishing RPC.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_outage_publication_marker on public.outages;
create trigger protect_outage_publication_marker
before insert or update on public.outages
for each row execute function public.protect_outage_publication_marker();

create or replace function public.protect_electricity_notice_publication_marker()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'postgres' and (
    (tg_op = 'INSERT' and new.publish_at is not null)
    or (tg_op = 'UPDATE' and new.publish_at is distinct from old.publish_at)
  ) then
    raise exception 'Notice publication state can only be changed through the publishing RPC.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_electricity_notice_publication_marker on public.electricity_notices;
create trigger protect_electricity_notice_publication_marker
before insert or update on public.electricity_notices
for each row execute function public.protect_electricity_notice_publication_marker();

create or replace function public.validate_outage_ward_relation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.ward_number is null or new.ward_number < 1 or new.ward_number > 19
    or not exists (
      select 1
      from public.outages o
      join public.wards w on w.municipality_id = o.municipality_id
      where o.id = new.outage_id and w.ward_number = new.ward_number
    ) then
    raise exception 'Affected outage ward does not belong to its municipality.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_outage_ward_relation on public.outage_wards;
create trigger validate_outage_ward_relation
before insert or update of outage_id, ward_number on public.outage_wards
for each row execute function public.validate_outage_ward_relation();

update public.profiles p
set ward_id = w.id
from public.wards w
where p.ward_id is null
  and p.municipality_id = w.municipality_id
  and p.ward_number = w.ward_number
  and p.ward_number between 1 and 19;

create or replace function public.is_active_municipality_admin(p_municipality_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'municipality_admin'
      and actor.is_active is true
      and (p_municipality_id is null or actor.municipality_id = p_municipality_id)
  );
$$;

revoke execute on function public.is_active_municipality_admin(uuid) from public, anon;
grant execute on function public.is_active_municipality_admin(uuid) to authenticated;

drop policy if exists "Users can view their delivery logs" on public.notification_deliveries;
create policy "Users can view their own or municipality delivery logs"
on public.notification_deliveries for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.outages o
    where o.id = notification_deliveries.outage_id
      and public.is_active_municipality_admin(o.municipality_id)
  )
  or exists (
    select 1 from public.electricity_notices n
    where n.id = notification_deliveries.notice_id
      and public.is_active_municipality_admin(n.municipality_id)
  )
);

drop policy if exists "Admins can manage outages" on public.outages;
create policy "Admins can manage outages in their municipality"
on public.outages for all
using (public.is_active_municipality_admin(outages.municipality_id))
with check (public.is_active_municipality_admin(outages.municipality_id));

drop policy if exists "Admins can manage outage wards" on public.outage_wards;
create policy "Admins can manage outage wards in their municipality"
on public.outage_wards for all
using (
  exists (
    select 1 from public.outages o
    where o.id = outage_wards.outage_id
      and public.is_active_municipality_admin(o.municipality_id)
  )
)
with check (
  exists (
    select 1 from public.outages o
    join public.wards w on w.municipality_id = o.municipality_id
      and w.ward_number = outage_wards.ward_number
    where o.id = outage_wards.outage_id
      and public.is_active_municipality_admin(o.municipality_id)
  )
);

drop policy if exists "Admins can manage electricity notices" on public.electricity_notices;
create policy "Admins can manage electricity notices in their municipality"
on public.electricity_notices for all
using (public.is_active_municipality_admin(electricity_notices.municipality_id))
with check (public.is_active_municipality_admin(electricity_notices.municipality_id));

drop policy if exists "Users can see their own profiles" on public.profiles;
create policy "Users can see their own profiles"
on public.profiles for select
using (
  auth.uid() = id
  or public.is_active_municipality_admin(profiles.municipality_id)
);

drop policy if exists "Residents and admins can view address correction requests" on public.address_correction_requests;
create policy "Residents and admins can view address correction requests"
on public.address_correction_requests for select
using (
  resident_id = auth.uid()
  or public.is_active_municipality_admin(address_correction_requests.municipality_id)
);

drop policy if exists "Residents and admins can view address correction audit" on public.address_correction_audit;
create policy "Residents and admins can view address correction audit"
on public.address_correction_audit for select
using (
  resident_id = auth.uid()
  or public.is_active_municipality_admin(address_correction_audit.municipality_id)
);

create or replace function public.verified_resident_ward_number(p_profile_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select w.ward_number
  from public.profiles p
  join public.wards w
    on w.municipality_id = p.municipality_id
   and (
     (p.ward_id is not null and w.id = p.ward_id)
     or (p.ward_id is null and p.ward_number is not null and w.ward_number = p.ward_number)
   )
  where p.id = p_profile_id
    and p.role = 'resident'
    and p.is_active is true
    and p.permanent_address_status = 'verified'
    and nullif(btrim(p.permanent_address), '') is not null
    and p.municipality_id is not null
    and w.ward_number between 1 and 19
    and (p.ward_number is null or p.ward_number = w.ward_number)
    and not exists (
      select 1 from public.address_correction_requests r
      where r.resident_id = p.id and r.status = 'pending'
    )
    and (p.id = auth.uid() or public.is_active_municipality_admin(p.municipality_id))
  limit 1;
$$;

revoke execute on function public.verified_resident_ward_number(uuid) from public, anon;
grant execute on function public.verified_resident_ward_number(uuid) to authenticated;

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
  old_ward integer;
  request_uuid uuid;
begin
  select * into resident from public.profiles where id = auth.uid() for update;
  if resident.id is null or resident.role <> 'resident' or resident.is_active is not true then
    raise exception 'Only an active resident can request an address correction.';
  end if;
  if p_new_ward is null or p_new_ward < 1 or p_new_ward > 19
    or nullif(btrim(p_new_address), '') is null
    or length(btrim(p_new_address)) < 3 or length(btrim(p_new_address)) > 300
    or nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'A valid ward, permanent address, and correction reason are required.';
  end if;
  if resident.municipality_id is null or not exists (
    select 1 from public.wards w
    where w.municipality_id = resident.municipality_id
      and w.ward_number = p_new_ward
      and w.ward_number between 1 and 19
  ) then
    raise exception 'The requested ward does not belong to your municipality.';
  end if;

  select w.ward_number into old_ward
  from public.wards w
  where w.municipality_id = resident.municipality_id
    and (
      (resident.ward_id is not null and w.id = resident.ward_id)
      or (resident.ward_id is null and resident.ward_number is not null and w.ward_number = resident.ward_number)
    )
    and (resident.ward_number is null or resident.ward_number = w.ward_number)
  limit 1;

  if old_ward = p_new_ward
    and lower(btrim(coalesce(resident.permanent_address, ''))) = lower(btrim(p_new_address)) then
    raise exception 'The requested address is unchanged.';
  end if;

  insert into public.address_correction_requests (
    resident_id, municipality_id, old_ward_number, old_address,
    new_ward_number, new_address, resident_reason
  ) values (
    resident.id, resident.municipality_id, old_ward, resident.permanent_address,
    p_new_ward, btrim(p_new_address), btrim(p_reason)
  ) returning id into request_uuid;
  return request_uuid;
end;
$$;

create or replace function public.claim_notification_deliveries(
  p_source_type text,
  p_source_id uuid,
  p_user_ids uuid[],
  p_channel text
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Delivery claims are restricted to the notification service.';
  end if;
  if p_source_type not in ('notice', 'outage') or p_channel not in ('email', 'push') then
    raise exception 'Invalid delivery claim source or channel.';
  end if;

  if p_source_type = 'outage' then
    return query
    insert into public.notification_deliveries (
      outage_id, notice_id, user_id, channel, status, sent_at, error_message
    )
    select p_source_id, null, requested.user_id, p_channel, 'pending', now(), null
    from (select distinct unnest(coalesce(p_user_ids, array[]::uuid[])) as user_id) requested
    where requested.user_id is not null
    on conflict (outage_id, user_id, channel) do update
      set status = 'pending', sent_at = now(), error_message = null
      where public.notification_deliveries.status in ('failed', 'skipped')
         or (public.notification_deliveries.status = 'pending'
             and public.notification_deliveries.sent_at < now() - interval '15 minutes')
    returning public.notification_deliveries.user_id;
  else
    return query
    insert into public.notification_deliveries (
      outage_id, notice_id, user_id, channel, status, sent_at, error_message
    )
    select null, p_source_id, requested.user_id, p_channel, 'pending', now(), null
    from (select distinct unnest(coalesce(p_user_ids, array[]::uuid[])) as user_id) requested
    where requested.user_id is not null
    on conflict (notice_id, user_id, channel) where notice_id is not null do update
      set status = 'pending', sent_at = now(), error_message = null
      where public.notification_deliveries.status in ('failed', 'skipped')
         or (public.notification_deliveries.status = 'pending'
             and public.notification_deliveries.sent_at < now() - interval '15 minutes')
    returning public.notification_deliveries.user_id;
  end if;
end;
$$;

revoke execute on function public.claim_notification_deliveries(text, uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(text, uuid, uuid[], text) to service_role;

create or replace function public.publish_electricity_notice(p_notice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_row public.electricity_notices%rowtype;
  actor public.profiles%rowtype;
  inserted_count integer := 0;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active Municipality Administrator can publish notices.';
  end if;

  select * into notice_row
  from public.electricity_notices
  where id = p_notice_id
  for update;
  if not found then raise exception 'Notice not found.'; end if;
  if notice_row.municipality_id is null or notice_row.municipality_id <> actor.municipality_id then
    raise exception 'Notice does not belong to the administrator municipality.';
  end if;
  if notice_row.status = 'cancelled' then
    raise exception 'A cancelled electricity notice cannot be published.';
  end if;

  if notice_row.publish_at is not null then
    return jsonb_build_object('published', true, 'already_published', true, 'recipient_count', 0);
  end if;
  if notice_row.ward_number <> 0 and not exists (
    select 1 from public.wards w
    where w.municipality_id = notice_row.municipality_id
      and w.ward_number = notice_row.ward_number
  ) then
    raise exception 'Notice ward does not belong to its municipality.';
  end if;

  update public.electricity_notices
  set publish_at = now(), updated_at = now()
  where id = p_notice_id;

  with inserted_notifications as (
    insert into public.notifications (
      user_id, title, message, notification_type, related_notice_id, ward_number
    )
    select p.id, notice_row.title, notice_row.message, notice_row.notice_type,
           notice_row.id, notice_row.ward_number
    from public.profiles p
    left join public.notification_preferences np on np.user_id = p.id
    where p.role = 'resident'
      and p.is_active is true
      and p.municipality_id = notice_row.municipality_id
      and coalesce(np.website_notifications, true)
      and (
        notice_row.ward_number = 0
        or public.verified_resident_ward_number(p.id) = notice_row.ward_number
      )
    on conflict do nothing
    returning user_id
  )
  insert into public.notification_deliveries (
    notice_id, user_id, channel, status, sent_at
  )
  select notice_row.id, inserted_notifications.user_id, 'in_app', 'sent', now()
  from inserted_notifications
  on conflict (notice_id, user_id, channel) where notice_id is not null
  do update set status = 'sent', sent_at = now(), error_message = null;

  get diagnostics inserted_count = row_count;
  return jsonb_build_object('published', true, 'already_published', false, 'recipient_count', inserted_count);
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
  inserted_count integer := 0;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active Municipality Administrator can publish outages.';
  end if;

  select * into outage_row
  from public.outages
  where id = p_outage_id
  for update;
  if not found then raise exception 'Outage not found.'; end if;
  if outage_row.municipality_id is null or outage_row.municipality_id <> actor.municipality_id then
    raise exception 'Outage does not belong to the administrator municipality.';
  end if;
  if outage_row.status = 'cancelled' then
    raise exception 'A cancelled outage cannot be published.';
  end if;

  if outage_row.notification_published_at is not null then
    return jsonb_build_object('published', true, 'already_published', true, 'recipient_count', 0);
  end if;

  if outage_row.is_municipality_wide is not true and not exists (
    select 1
    from public.wards w
    where w.municipality_id = outage_row.municipality_id
      and (
        w.ward_number = outage_row.ward_number
        or exists (
          select 1 from public.outage_wards ow
          where ow.outage_id = outage_row.id and ow.ward_number = w.ward_number
        )
      )
  ) then
    raise exception 'Outage has no valid target wards for its municipality.';
  end if;

  with target_residents as (
    select p.id, public.verified_resident_ward_number(p.id) as ward_number
    from public.profiles p
    where p.role = 'resident'
      and p.is_active is true
      and p.municipality_id = outage_row.municipality_id
      and (
        outage_row.is_municipality_wide is true
        or public.verified_resident_ward_number(p.id) in (
          select w.ward_number
          from public.wards w
          where w.municipality_id = outage_row.municipality_id
            and (
              w.ward_number = outage_row.ward_number
              or exists (
                select 1 from public.outage_wards ow
                where ow.outage_id = outage_row.id and ow.ward_number = w.ward_number
              )
            )
        )
      )
  ), inserted_notifications as (
    insert into public.notifications (
      user_id, title, message, notification_type, related_outage_id, ward_number
    )
    select target_residents.id,
           coalesce(outage_row.title_en, 'Electricity Alert'),
           coalesce(outage_row.reason_en, 'An electricity outage notice has been issued.'),
           lower(coalesce(outage_row.status, 'outage')),
           outage_row.id,
           case when outage_row.is_municipality_wide is true then 0 else target_residents.ward_number end
    from target_residents
    left join public.notification_preferences np on np.user_id = target_residents.id
    where coalesce(np.website_notifications, true)
    on conflict do nothing
    returning user_id
  )
  insert into public.notification_deliveries (
    outage_id, user_id, channel, status, sent_at
  )
  select outage_row.id, inserted_notifications.user_id, 'in_app', 'sent', now()
  from inserted_notifications
  on conflict (outage_id, user_id, channel)
  do update set status = 'sent', sent_at = now(), error_message = null;

  get diagnostics inserted_count = row_count;
  update public.outages
  set notification_published_at = now(), updated_at = now()
  where id = outage_row.id;

  return jsonb_build_object('published', true, 'already_published', false, 'recipient_count', inserted_count);
end;
$$;

revoke execute on function public.publish_electricity_notice(uuid) from public;
revoke execute on function public.publish_outage_notifications(uuid) from public;
grant execute on function public.publish_electricity_notice(uuid) to authenticated;
grant execute on function public.publish_outage_notifications(uuid) to authenticated;

drop policy if exists "Users can see outages" on public.outages;
create policy "Users can see outages"
on public.outages for select
using (
  auth.uid() is null
  or public.is_active_municipality_admin(outages.municipality_id)
  or exists (
    select 1 from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'resident'
      and actor.municipality_id = outages.municipality_id
      and (
        outages.is_municipality_wide is true
        or public.verified_resident_ward_number(actor.id) in (
          select w.ward_number
          from public.wards w
          where w.municipality_id = outages.municipality_id
            and (
              w.ward_number = outages.ward_number
              or exists (
                select 1 from public.outage_wards ow
                where ow.outage_id = outages.id and ow.ward_number = w.ward_number
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
  and publish_at is not null
  and publish_at <= now()
  and (
    auth.uid() is null
    or public.is_active_municipality_admin(electricity_notices.municipality_id)
    or exists (
      select 1 from public.profiles actor
      where actor.id = auth.uid()
        and actor.role = 'resident'
        and actor.municipality_id = electricity_notices.municipality_id
        and (
          electricity_notices.ward_number = 0
          or public.verified_resident_ward_number(actor.id) = electricity_notices.ward_number
        )
    )
  )
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  municipality_uuid uuid;
  ward_uuid uuid;
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

  select w.id into ward_uuid
  from public.wards w
  where w.municipality_id = municipality_uuid
    and w.ward_number = numeric_ward
    and w.ward_number between 1 and 19;
  if ward_uuid is null then
    raise exception 'The selected ward does not belong to Bheemdatta Municipality.';
  end if;

  insert into public.profiles (
    id, full_name, phone, role, municipality_id, ward_id, ward_number,
    permanent_address, permanent_address_status, created_at, updated_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Resident'),
    new.raw_user_meta_data ->> 'phone_number',
    'resident', municipality_uuid, ward_uuid, numeric_ward,
    address_text, 'verified', now(), now()
  )
  on conflict (id) do nothing;

  return new;
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
  target_ward_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active municipality administrator can approve address corrections.';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'An administrator approval reason is required.';
  end if;

  select * into correction from public.address_correction_requests where id = p_request_id for update;
  if correction.id is null or correction.status <> 'pending' then
    raise exception 'Pending address correction request not found.';
  end if;
  if correction.municipality_id <> actor.municipality_id then
    raise exception 'Address correction belongs to another municipality.';
  end if;

  select w.id into target_ward_id
  from public.wards w
  where w.municipality_id = correction.municipality_id
    and w.ward_number = correction.new_ward_number
    and w.ward_number between 1 and 19;
  if target_ward_id is null then
    raise exception 'The requested ward is not valid for the resident municipality.';
  end if;

  update public.profiles
  set ward_id = target_ward_id,
      ward_number = correction.new_ward_number,
      permanent_address = correction.new_address,
      permanent_address_status = 'verified',
      updated_at = now()
  where id = correction.resident_id
    and municipality_id = correction.municipality_id
    and role = 'resident';
  if not found then raise exception 'Resident profile no longer matches the correction request.'; end if;

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
  correction public.address_correction_requests%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active municipality administrator can review address corrections.';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'A decision reason is required.';
  end if;

  select * into correction from public.address_correction_requests where id = p_request_id for update;
  if correction.id is null or correction.status <> 'pending' then
    raise exception 'Pending address correction request not found.';
  end if;
  if correction.municipality_id <> actor.municipality_id then
    raise exception 'Address correction belongs to another municipality.';
  end if;

  update public.address_correction_requests
  set status = 'rejected', approved_by = actor.id,
      decision_reason = btrim(p_reason), reviewed_at = now()
  where id = correction.id;
end;
$$;