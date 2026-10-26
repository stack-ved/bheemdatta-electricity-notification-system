-- 1. Ensure columns exist on public.outages and public.electricity_notices
alter table public.outages
  add column if not exists notification_published_at timestamptz;

alter table public.electricity_notices
  add column if not exists municipality_id uuid references public.municipalities(id);

update public.electricity_notices
set municipality_id = '2ecd008c-bd28-49c5-8fc8-bbdcf212b12f'
where municipality_id is null;

-- 2. Ensure columns exist on public.profiles
alter table public.profiles
  add column if not exists ward_number integer,
  add column if not exists ward_id uuid references public.wards(id) on delete set null,
  add column if not exists permanent_address text,
  add column if not exists is_active boolean default true;

-- 3. Update public.notification_deliveries columns and constraints
alter table public.notification_deliveries
  add column if not exists outage_id uuid references public.outages(id) on delete cascade,
  add column if not exists notice_id uuid references public.electricity_notices(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists channel text check (channel in ('push', 'email', 'in_app')),
  add column if not exists error_message text;

-- Make legacy columns nullable if they had not-null constraints
alter table public.notification_deliveries
  alter column source_type drop not null,
  alter column source_id drop not null,
  alter column recipient_user_id drop not null;

-- Drop legacy unique constraint if exists
alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_source_type_source_id_recipient_use_key;

-- Ensure channel is populated for any existing rows and add check/defaults
update public.notification_deliveries
set channel = 'email'
where channel is null;

alter table public.notification_deliveries
  alter column channel set not null;

-- Create partial unique indexes to prevent duplicate deliveries per channel
create unique index if not exists notification_deliveries_outage_recipient_channel_key
  on public.notification_deliveries (outage_id, user_id, channel)
  where outage_id is not null;

create unique index if not exists notification_deliveries_notice_recipient_channel_key
  on public.notification_deliveries (notice_id, user_id, channel)
  where notice_id is not null;

create index if not exists idx_notification_deliveries_user_id
  on public.notification_deliveries (user_id);

create index if not exists idx_notification_deliveries_outage_id
  on public.notification_deliveries (outage_id);

create index if not exists idx_notification_deliveries_notice_id
  on public.notification_deliveries (notice_id);

-- 4. Enable RLS and create narrow policies for notification_deliveries
alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can view their delivery logs" on public.notification_deliveries;
drop policy if exists "Admins can view notification deliveries in their municipality" on public.notification_deliveries;
drop policy if exists "Users can view their own deliveries" on public.notification_deliveries;

create policy "Admins can view notification deliveries in their municipality"
on public.notification_deliveries for select
using (
  exists (
    select 1 from public.outages o
    join public.profiles actor on actor.id = auth.uid()
    where o.id = notification_deliveries.outage_id
      and actor.role = 'municipality_admin'
      and actor.is_active is true
      and o.municipality_id = actor.municipality_id
  )
  or exists (
    select 1 from public.electricity_notices n
    join public.profiles actor on actor.id = auth.uid()
    where n.id = notification_deliveries.notice_id
      and actor.role = 'municipality_admin'
      and actor.is_active is true
      and n.municipality_id = actor.municipality_id
  )
  or (auth.uid() = notification_deliveries.user_id)
);

grant select on public.notification_deliveries to authenticated;

-- 5. Create secure authenticated RPC for municipality admin delivery history
create or replace function public.get_municipality_delivery_logs(p_outage_id uuid default null)
returns table (
  id uuid,
  outage_id uuid,
  notice_id uuid,
  user_id uuid,
  ward_number integer,
  channel text,
  status text,
  error_message text,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
begin
  select * into actor from public.profiles prof where prof.id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true or actor.municipality_id is null then
    raise exception 'Only an active Municipality Administrator can view delivery logs.';
  end if;

  return query
  select
    nd.id,
    nd.outage_id,
    nd.notice_id,
    nd.user_id,
    coalesce(p.ward_number, w.ward_number) as ward_number,
    nd.channel,
    nd.status,
    coalesce(nd.error_message, nd.last_error) as error_message,
    coalesce(nd.sent_at, nd.attempted_at, nd.created_at) as sent_at
  from public.notification_deliveries nd
  left join public.profiles p on p.id = coalesce(nd.user_id, nd.recipient_user_id)
  left join public.wards w on w.id = p.ward_id
  left join public.outages o on o.id = coalesce(nd.outage_id, nd.source_id)
  left join public.electricity_notices n on n.id = coalesce(nd.notice_id, nd.source_id)
  where (
    (coalesce(nd.outage_id, nd.source_id) is not null and o.municipality_id = actor.municipality_id)
    or
    (coalesce(nd.notice_id, nd.source_id) is not null and n.municipality_id = actor.municipality_id)
  )
  and (p_outage_id is null or coalesce(nd.outage_id, nd.source_id) = p_outage_id)
  order by coalesce(nd.sent_at, nd.attempted_at, nd.created_at) desc
  limit 100;
end;
$$;

revoke execute on function public.get_municipality_delivery_logs(uuid) from public, anon;
grant execute on function public.get_municipality_delivery_logs(uuid) to authenticated;

-- 6. Claim notification deliveries RPC for Edge Functions
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
      outage_id, notice_id, user_id, channel, status, sent_at, error_message, source_type, source_id, recipient_user_id
    )
    select p_source_id, null, requested.user_id, p_channel, 'pending', now(), null, 'outage', p_source_id, requested.user_id
    from (select distinct unnest(coalesce(p_user_ids, array[]::uuid[])) as user_id) requested
    where requested.user_id is not null
    on conflict (outage_id, user_id, channel) where outage_id is not null do update
      set status = 'pending', sent_at = now(), error_message = null
      where public.notification_deliveries.status in ('failed', 'skipped')
         or (public.notification_deliveries.status = 'pending'
             and public.notification_deliveries.sent_at < now() - interval '15 minutes')
    returning public.notification_deliveries.user_id;
  else
    return query
    insert into public.notification_deliveries (
      outage_id, notice_id, user_id, channel, status, sent_at, error_message, source_type, source_id, recipient_user_id
    )
    select null, p_source_id, requested.user_id, p_channel, 'pending', now(), null, 'notice', p_source_id, requested.user_id
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

-- 7. Fix handle_new_user_profile to correctly populate municipality_id, ward_number, and ward_id
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mun_id uuid;
  w_num integer;
  w_id uuid;
begin
  -- Resolve municipality_id from metadata or fallback to Bheemdatta
  begin
    mun_id := (new.raw_user_meta_data ->> 'municipality_id')::uuid;
  exception when others then
    mun_id := null;
  end;

  if mun_id is null then
    select id into mun_id from public.municipalities
    where lower(name_en) = lower('Bheemdatta Municipality')
    order by created_at limit 1;
  end if;

  -- Resolve ward_number from metadata
  begin
    w_num := (new.raw_user_meta_data ->> 'ward_number')::integer;
  exception when others then
    w_num := null;
  end;

  -- Resolve ward_id from wards table
  if mun_id is not null and w_num is not null and w_num between 1 and 19 then
    select id into w_id from public.wards
    where municipality_id = mun_id and ward_number = w_num
    limit 1;
  end if;

  insert into public.profiles (
    id, full_name, phone, role, municipality_id, ward_id, ward_number,
    permanent_address, is_active, created_at, updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Resident'),
    new.raw_user_meta_data ->> 'phone_number',
    coalesce(new.raw_user_meta_data ->> 'role', 'resident'),
    mun_id,
    w_id,
    w_num,
    nullif(btrim(new.raw_user_meta_data ->> 'permanent_address'), ''),
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    municipality_id = coalesce(excluded.municipality_id, public.profiles.municipality_id),
    ward_id = coalesce(excluded.ward_id, public.profiles.ward_id),
    ward_number = coalesce(excluded.ward_number, public.profiles.ward_number),
    permanent_address = coalesce(excluded.permanent_address, public.profiles.permanent_address),
    updated_at = now();

  return new;
end;
$$;

-- 8. Repair existing profiles where municipality_id, ward_id, or ward_number is missing
update public.profiles p
set
  municipality_id = coalesce(p.municipality_id, (u.raw_user_meta_data ->> 'municipality_id')::uuid, '2ecd008c-bd28-49c5-8fc8-bbdcf212b12f'::uuid),
  ward_number = coalesce(p.ward_number, (u.raw_user_meta_data ->> 'ward_number')::integer, 3),
  ward_id = coalesce(
    p.ward_id,
    (
      select w.id from public.wards w
      where w.municipality_id = coalesce(p.municipality_id, (u.raw_user_meta_data ->> 'municipality_id')::uuid, '2ecd008c-bd28-49c5-8fc8-bbdcf212b12f'::uuid)
        and w.ward_number = coalesce(p.ward_number, (u.raw_user_meta_data ->> 'ward_number')::integer, 3)
      limit 1
    )
  ),
  updated_at = now()
from auth.users u
where p.id = u.id
  and p.role = 'resident'
  and (p.municipality_id is null or p.ward_number is null or p.ward_id is null);

-- 9. Overwrite publish_outage_notifications with robust targeting & already_published detection
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
    raise exception 'Only an active Municipality Administrator can publish outages.';
  end if;

  select * into outage_row
  from public.outages
  where id = p_outage_id
    and municipality_id = actor.municipality_id
  for update;

  if not found then
    raise exception 'Outage notice not found or belongs to a different municipality.';
  end if;

  if outage_row.status = 'cancelled' then
    raise exception 'A cancelled outage cannot be published.';
  end if;

  -- Check if already published
  if outage_row.notification_published_at is not null then
    return jsonb_build_object('published', true, 'already_published', true, 'recipient_count', 0);
  end if;

  -- Insert notifications for eligible active residents
  with target_residents as (
    select
      p.id,
      coalesce(p.ward_number, w.ward_number) as resolved_ward
    from public.profiles p
    left join public.wards w on w.id = p.ward_id
    where p.role = 'resident'
      and p.is_active is true
      and (p.municipality_id = actor.municipality_id or w.municipality_id = actor.municipality_id)
      and coalesce(p.ward_number, w.ward_number) between 1 and 19
      and (
        outage_row.is_municipality_wide is true
        or coalesce(p.ward_number, w.ward_number) in (
          select ow.ward_number from public.outage_wards ow where ow.outage_id = outage_row.id
          union
          select outage_row.ward_number where outage_row.ward_number is not null and outage_row.ward_number between 1 and 19
        )
      )
  ), inserted_notifications as (
    insert into public.notifications (
      user_id, title, message, notification_type, related_outage_id, ward_number
    )
    select
      tr.id,
      coalesce(outage_row.title_en, 'Electricity Alert'),
      coalesce(outage_row.reason_en, 'An electricity outage notice has been issued.'),
      lower(coalesce(outage_row.status, 'outage')),
      outage_row.id,
      case when outage_row.is_municipality_wide is true then 0 else tr.resolved_ward end
    from target_residents tr
    left join public.notification_preferences np on np.user_id = tr.id
    where coalesce(np.website_notifications, true)
    on conflict do nothing
    returning user_id
  )
  insert into public.notification_deliveries (
    outage_id, user_id, channel, status, sent_at
  )
  select outage_row.id, in_app.user_id, 'in_app', 'sent', now()
  from inserted_notifications in_app
  on conflict (outage_id, user_id, channel) where outage_id is not null
  do update set status = 'sent', sent_at = now(), error_message = null;

  get diagnostics recipient_count = row_count;

  -- Mark outage as published
  update public.outages
  set notification_published_at = now(), updated_at = now()
  where id = outage_row.id;

  return jsonb_build_object('published', true, 'already_published', false, 'recipient_count', recipient_count);
end;
$$;

revoke execute on function public.publish_outage_notifications(uuid) from public, anon;
grant execute on function public.publish_outage_notifications(uuid) to authenticated;

-- 10. Overwrite publish_electricity_notice with robust targeting & delivery logging
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
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true or actor.municipality_id is null then
    raise exception 'Only an active Municipality Administrator can publish notices.';
  end if;

  select * into notice_row
  from public.electricity_notices
  where id = p_notice_id
  for update;

  if not found then
    raise exception 'Notice not found.';
  end if;

  if notice_row.municipality_id is not null and notice_row.municipality_id <> actor.municipality_id then
    raise exception 'Notice belongs to a different municipality.';
  end if;

  if notice_row.status = 'cancelled' then
    raise exception 'A cancelled notice cannot be published.';
  end if;

  if notice_row.publish_at is not null then
    return jsonb_build_object('published', true, 'recipient_count', 0, 'already_published', true);
  end if;

  update public.electricity_notices
  set publish_at = now(), updated_at = now(), municipality_id = coalesce(notice_row.municipality_id, actor.municipality_id)
  where id = p_notice_id;

  with target_residents as (
    select
      p.id,
      coalesce(p.ward_number, w.ward_number) as resolved_ward
    from public.profiles p
    left join public.wards w on w.id = p.ward_id
    where p.role = 'resident'
      and p.is_active is true
      and (p.municipality_id = actor.municipality_id or w.municipality_id = actor.municipality_id)
      and (
        notice_row.ward_number = 0
        or coalesce(p.ward_number, w.ward_number) = notice_row.ward_number
      )
  ), inserted_notifications as (
    insert into public.notifications (user_id, title, message, notification_type, related_notice_id, ward_number)
    select tr.id, notice_row.title, notice_row.message, coalesce(notice_row.notice_type, 'notice'),
           notice_row.id, case when notice_row.ward_number = 0 then 0 else tr.resolved_ward end
    from target_residents tr
    left join public.notification_preferences np on np.user_id = tr.id
    where coalesce(np.website_notifications, true)
    on conflict do nothing
    returning user_id
  )
  insert into public.notification_deliveries (
    notice_id, user_id, channel, status, sent_at
  )
  select notice_row.id, in_app.user_id, 'in_app', 'sent', now()
  from inserted_notifications in_app
  on conflict (notice_id, user_id, channel) where notice_id is not null
  do update set status = 'sent', sent_at = now(), error_message = null;

  get diagnostics recipient_count = row_count;
  return jsonb_build_object('published', true, 'recipient_count', recipient_count, 'already_published', false);
end;
$$;

revoke execute on function public.publish_electricity_notice(uuid) from public, anon;
grant execute on function public.publish_electricity_notice(uuid) to authenticated;

