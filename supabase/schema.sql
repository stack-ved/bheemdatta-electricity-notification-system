create extension if not exists "pgcrypto";

create table if not exists municipalities (
  id uuid primary key default gen_random_uuid(),
  name_en text,
  name_np text,
  district text,
  province text,
  created_at timestamptz default now()
);

create table if not exists wards (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities(id) on delete cascade,
  ward_number integer not null,
  created_at timestamptz default now(),
  unique (municipality_id, ward_number)
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid references municipalities(id) on delete set null,
  ward_id uuid references wards(id) on delete set null,
  name_en text,
  name_np text,
  location_type text check (
    location_type in (
      'tole',
      'area',
      'neighborhood',
      'transformer_area',
      'distribution_area',
      'substation',
      'road',
      'custom'
    )
  ),
  latitude numeric,
  longitude numeric,
  description text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'resident' check (role in ('resident', 'municipality_admin')),
  municipality_id uuid,
  ward_id uuid,
  ward_number integer,
  permanent_address text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe migration for existing deployments: convert any legacy admin/ward/staff roles to municipality_admin without data loss
update public.profiles
set role = 'municipality_admin'
where role in ('ward_admin', 'municipal_admin', 'municipality_staff', 'nea_technical_staff');

alter table profiles add column if not exists ward_number integer;
alter table profiles add column if not exists permanent_address text;
alter table profiles add column if not exists is_active boolean default true;

create table if not exists outages (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid references municipalities(id) on delete set null,
  title_en text,
  title_np text,
  reason_en text,
  reason_np text,
  start_time timestamptz,
  expected_end_time timestamptz,
  actual_end_time timestamptz,
  ward_number integer,
  affected_area text,
  is_municipality_wide boolean default false,
  priority text default 'medium',
  status text check (status in ('scheduled', 'active', 'restoration', 'restored', 'cancelled')),
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table outages add column if not exists is_municipality_wide boolean default false;
alter table outages add column if not exists title_np text;
alter table outages add column if not exists reason_np text;
alter table outages add column if not exists ward_number integer;
alter table outages add column if not exists affected_area text;
alter table outages add column if not exists priority text default 'medium';

-- Relational table supporting multiple affected wards per outage notice
create table if not exists outage_wards (
  id uuid primary key default gen_random_uuid(),
  outage_id uuid not null references outages(id) on delete cascade,
  ward_number integer not null check (ward_number between 1 and 19),
  created_at timestamptz default now(),
  unique (outage_id, ward_number)
);

-- Seed outage_wards from existing outages if any exist
insert into public.outage_wards (outage_id, ward_number)
select id, ward_number from public.outages where ward_number is not null
on conflict (outage_id, ward_number) do nothing;

create table if not exists outage_locations (
  outage_id uuid not null references outages(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  primary key (outage_id, location_id)
);

create table if not exists problem_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique not null,
  user_id uuid not null,
  municipality_id uuid,
  ward_id uuid,
  ward_number integer,
  location_id uuid,
  problem_type text not null,
  description text not null,
  latitude numeric not null,
  longitude numeric not null,
  location_accuracy numeric,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'emergency')),
  status text default 'submitted' check (status in ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected')),
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table problem_reports add column if not exists ward_number integer;
alter table problem_reports add column if not exists admin_notes text;

create table if not exists electricity_notices (
  id uuid primary key default gen_random_uuid(),
  ward_number integer not null,
  title text not null,
  message text not null,
  notice_type text not null default 'general',
  category text,
  affected_area text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'emergency')),
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'restored', 'cancelled')),
  start_at timestamptz,
  end_at timestamptz,
  publish_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references problem_reports(id) on delete cascade,
  photo_path text not null,
  photo_captured_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references problem_reports(id) on delete cascade,
  status text not null check (status in ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected')),
  note text,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz default now()
);

alter table report_status_history add column if not exists changed_by_name text;

create table if not exists electricity_officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text,
  phone text,
  email text,
  ward_number integer not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  ward_number integer,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'rejected', 'completed')),
  requested_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz default now()
);

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  website_notifications boolean not null default true,
  browser_notifications boolean not null default true,
  email_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null,
  related_notice_id uuid references electricity_notices(id) on delete cascade,
  related_outage_id uuid references outages(id) on delete cascade,
  ward_number integer not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_source_check check (
    related_notice_id is not null or related_outage_id is not null
  )
);

create unique index if not exists notifications_notice_recipient_key
  on notifications (user_id, related_notice_id)
  where related_notice_id is not null;

create unique index if not exists notifications_outage_recipient_key
  on notifications (user_id, related_outage_id)
  where related_outage_id is not null;

create index if not exists idx_notifications_user_created_at
  on notifications (user_id, created_at desc);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ward_number integer not null,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions (user_id);
create index if not exists idx_push_subscriptions_ward_number on push_subscriptions (ward_number);

-- Notification delivery tracking table to prevent duplicates and maintain delivery log
create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  outage_id uuid references outages(id) on delete cascade,
  notice_id uuid references electricity_notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('push', 'email', 'in_app')),
  status text not null check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz default now(),
  error_message text,
  unique (outage_id, user_id, channel)
);

create unique index if not exists notification_deliveries_notice_recipient_key
  on notification_deliveries (notice_id, user_id, channel)
  where notice_id is not null;

create unique index if not exists notification_deliveries_outage_recipient_key
  on notification_deliveries (outage_id, user_id, channel)
  where outage_id is not null;

create index if not exists idx_notification_deliveries_user_id on notification_deliveries (user_id);
create index if not exists idx_notification_deliveries_outage_id on notification_deliveries (outage_id);

alter table notification_preferences enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_deliveries enable row level security;
alter table notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

alter table electricity_officers enable row level security;
alter table password_reset_requests enable row level security;

create index if not exists idx_wards_municipality_id on wards (municipality_id);
create index if not exists idx_locations_municipality_id on locations (municipality_id);
create index if not exists idx_locations_ward_id on locations (ward_id);
create index if not exists idx_outages_municipality_id on outages (municipality_id);
create index if not exists idx_outage_wards_outage_id on outage_wards (outage_id);
create index if not exists idx_outage_wards_ward_number on outage_wards (ward_number);
create index if not exists idx_problem_reports_user_id on problem_reports (user_id);
create index if not exists idx_problem_reports_municipality_id on problem_reports (municipality_id);
create index if not exists idx_report_photos_report_id on report_photos (report_id);
create index if not exists idx_report_status_history_report_id on report_status_history (report_id);
create index if not exists idx_outages_ward_number on outages (ward_number);
create index if not exists idx_electricity_notices_ward_number on electricity_notices (ward_number);

insert into municipalities (id, name_en, name_np, district, province)
values (
  gen_random_uuid(),
  'Bheemdatta Municipality',
  'भीमदत्त नगरपालिका',
  'Kanchanpur',
  'Sudurpashchim Province'
)
on conflict do nothing;

-- Seed wards for Bheemdatta Municipality (Wards 1 to 19)
with municipality_seed as (
  select id from municipalities where name_en = 'Bheemdatta Municipality' limit 1
)
insert into wards (municipality_id, ward_number)
select municipality_seed.id, ward_num
from municipality_seed
cross join generate_series(1, 19) as ward_num
on conflict (municipality_id, ward_number) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  municipality_uuid uuid;
begin
  select id into municipality_uuid
  from public.municipalities
  where name_en = 'Bheemdatta Municipality'
  limit 1;

  insert into public.profiles (id, full_name, phone, municipality_id, ward_number, permanent_address, role, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Resident'),
    new.raw_user_meta_data ->> 'phone_number',
    coalesce((new.raw_user_meta_data ->> 'municipality_id')::uuid, municipality_uuid),
    coalesce((new.raw_user_meta_data ->> 'ward_number')::integer, 3),
    nullif(trim(new.raw_user_meta_data ->> 'permanent_address'), ''),
    'resident',
    now(),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    municipality_id = coalesce(excluded.municipality_id, public.profiles.municipality_id),
    ward_number = coalesce(excluded.ward_number, public.profiles.ward_number),
    permanent_address = coalesce(excluded.permanent_address, public.profiles.permanent_address),
    role = 'resident',
    updated_at = now();

  return new;
end;
$$;

create or replace function public.validate_resident_profile()
returns trigger
language plpgsql
as $$
begin
  if NEW.role = 'resident' then
    if NEW.municipality_id is null then
      raise exception 'Resident municipality is required.';
    end if;

    if NEW.ward_number is null or NEW.ward_number < 1 or NEW.ward_number > 19 then
      raise exception 'Resident ward must be between 1 and 19.';
    end if;

    if NEW.permanent_address is null or btrim(NEW.permanent_address) = '' then
      raise exception 'Resident permanent address is required before ward-based notifications can be enabled.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_resident_profile_data on public.profiles;
create trigger enforce_resident_profile_data
before insert or update on public.profiles
for each row execute function public.validate_resident_profile();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.generate_report_number()
returns trigger
language plpgsql
as $$
declare
  current_year int;
  next_number int;
begin
  current_year := extract(year from now());
  select coalesce(max(cast(right(report_number, 6) as integer)), 0) + 1
  into next_number
  from public.problem_reports
  where report_number like 'BEA-' || current_year || '-%';

  new.report_number := 'BEA-' || current_year || '-' || lpad(next_number::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_generate_report_number on public.problem_reports;
create trigger trg_generate_report_number
before insert on public.problem_reports
for each row execute function public.generate_report_number();

create or replace function public.add_default_report_status_history()
returns trigger
language plpgsql
as $$
begin
  insert into public.report_status_history (report_id, status, note, changed_by, created_at)
  values (new.id, 'submitted', 'Report received and submitted by resident.', new.user_id, now());
  return new;
end;
$$;

drop trigger if exists trg_add_default_report_status_history on public.problem_reports;
create trigger trg_add_default_report_status_history
after insert on public.problem_reports
for each row execute function public.add_default_report_status_history();

alter table municipalities enable row level security;
alter table wards enable row level security;
alter table locations enable row level security;
alter table profiles enable row level security;
alter table outages enable row level security;
alter table outage_wards enable row level security;
alter table outage_locations enable row level security;
alter table problem_reports enable row level security;
alter table report_photos enable row level security;
alter table report_status_history enable row level security;
alter table electricity_notices enable row level security;

drop policy if exists "Users can view their notification preferences" on public.notification_preferences;
create policy "Users can view their notification preferences"
on public.notification_preferences for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their notification preferences" on public.notification_preferences;
create policy "Users can create their notification preferences"
on public.notification_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their notification preferences" on public.notification_preferences;
create policy "Users can update their notification preferences"
on public.notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their push subscriptions" on public.push_subscriptions;
create policy "Users can manage their push subscriptions"
on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their delivery logs" on public.notification_deliveries;
create policy "Users can view their delivery logs"
on public.notification_deliveries for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

-- Publish Electricity Notice Procedure
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
  if actor.id is null or actor.role <> 'municipality_admin' or actor.is_active is not true then
    raise exception 'Only an active Municipality Administrator can publish notices';
  end if;

  select * into notice_row
  from public.electricity_notices
  where id = p_notice_id
  for update;

  if not found then
    raise exception 'Notice not found';
  end if;

  if notice_row.publish_at is not null then
    return jsonb_build_object('published', false, 'recipient_count', 0);
  end if;

  update public.electricity_notices
  set publish_at = now(), updated_at = now()
  where id = p_notice_id;

  insert into public.notifications (user_id, title, message, notification_type, related_notice_id, ward_number)
  select p.id, notice_row.title, notice_row.message, notice_row.notice_type,
         notice_row.id, notice_row.ward_number
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.role = 'resident'
    and p.is_active is true
    and (notice_row.ward_number = 0 or p.ward_number = notice_row.ward_number)
    and coalesce(np.website_notifications, true)
  on conflict do nothing;

  get diagnostics recipient_count = row_count;
  return jsonb_build_object('published', true, 'recipient_count', recipient_count);
end;
$$;

-- Publish Outage Notifications Procedure (Multi-Ward & Municipality-Wide Targeting)
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

  select * into outage_row
  from public.outages
  where id = p_outage_id;

  if not found then
    raise exception 'Outage notice not found';
  end if;

  insert into public.notifications (user_id, title, message, notification_type, related_outage_id, ward_number)
  select p.id,
         coalesce(outage_row.title_en, 'Electricity Alert'),
         coalesce(outage_row.reason_en, 'An electricity outage notice has been issued.'),
         lower(coalesce(outage_row.status, 'outage')),
         outage_row.id,
         coalesce(p.ward_number, 1)
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.role = 'resident'
    and p.is_active is true
    and (
      outage_row.is_municipality_wide is true
      or p.ward_number in (
        select ow.ward_number from public.outage_wards ow where ow.outage_id = p_outage_id
        union
        select outage_row.ward_number where outage_row.ward_number is not null
      )
    )
    and coalesce(np.website_notifications, true)
  on conflict do nothing;

  get diagnostics recipient_count = row_count;

  -- Record in-app deliveries
  insert into public.notification_deliveries (outage_id, user_id, channel, status, sent_at)
  select outage_row.id, p.id, 'in_app', 'sent', now()
  from public.profiles p
  where p.role = 'resident'
    and p.is_active is true
    and (
      outage_row.is_municipality_wide is true
      or p.ward_number in (
        select ow.ward_number from public.outage_wards ow where ow.outage_id = p_outage_id
        union
        select outage_row.ward_number where outage_row.ward_number is not null
      )
    )
  on conflict (outage_id, user_id, channel) do update set sent_at = now(), status = 'sent';

  return jsonb_build_object('published', true, 'recipient_count', recipient_count);
end;
$$;

revoke execute on function public.publish_electricity_notice(uuid) from public;
revoke execute on function public.publish_outage_notifications(uuid) from public;
grant execute on function public.publish_electricity_notice(uuid) to authenticated;
grant execute on function public.publish_outage_notifications(uuid) to authenticated;

drop policy if exists "Municipalities are viewable by all authenticated and anonymous users" on public.municipalities;
create policy "Municipalities are viewable by all authenticated and anonymous users"
on public.municipalities for select
using (true);

drop policy if exists "Wards are viewable by all users" on public.wards;
create policy "Wards are viewable by all users"
on public.wards for select
using (true);

drop policy if exists "Locations are viewable by all users" on public.locations;
create policy "Locations are viewable by all users"
on public.locations for select
using (true);

drop policy if exists "Users can see their own profiles" on public.profiles;
create policy "Users can see their own profiles"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their own profiles without changing role" on public.profiles;
create policy "Users can update their own profiles without changing role"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select role from public.profiles where id = auth.uid())
);

drop policy if exists "Residents can create their own reports" on public.problem_reports;
create policy "Residents can create their own reports"
on public.problem_reports for insert
with check (auth.uid() = user_id);

drop policy if exists "Residents can view their own reports" on public.problem_reports;
create policy "Residents can view their own reports"
on public.problem_reports for select
using (auth.uid() = user_id);

drop policy if exists "Admins can view all reports" on public.problem_reports;
create policy "Admins can view all reports"
on public.problem_reports for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Admins can update report statuses" on public.problem_reports;
create policy "Admins can update report statuses"
on public.problem_reports for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Residents can view their own report photos" on public.report_photos;
create policy "Residents can view their own report photos"
on public.report_photos for select
using (
  exists (
    select 1 from public.problem_reports pr
    where pr.id = report_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view any report photos" on public.report_photos;
create policy "Admins can view any report photos"
on public.report_photos for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Users can insert report photos for their own reports" on public.report_photos;
create policy "Users can insert report photos for their own reports"
on public.report_photos for insert
with check (
  exists (
    select 1
    from public.problem_reports pr
    where pr.id = report_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Residents can view their own report status history" on public.report_status_history;
create policy "Residents can view their own report status history"
on public.report_status_history for select
using (
  exists (
    select 1 from public.problem_reports pr
    where pr.id = report_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view any report status history" on public.report_status_history;
create policy "Admins can view any report status history"
on public.report_status_history for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Residents can insert their own status history" on public.report_status_history;
create policy "Residents can insert their own status history"
on public.report_status_history for insert
with check (
  exists (
    select 1 from public.problem_reports pr
    where pr.id = report_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert status history" on public.report_status_history;
create policy "Admins can insert status history"
on public.report_status_history for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Admins can manage outages" on public.outages;
create policy "Admins can manage outages"
on public.outages for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Users can view targeted outages" on public.outages;
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
        or outages.is_municipality_wide is true
        or p.ward_number = outages.ward_number
        or exists (
          select 1 from public.wards w
          where w.id = p.ward_id and w.ward_number = outages.ward_number
        )
      )
  )
);

drop policy if exists "Outage wards are viewable by all" on public.outage_wards;
create policy "Outage wards are viewable by all"
on public.outage_wards for select
using (true);

drop policy if exists "Admins can manage outage wards" on public.outage_wards;
create policy "Admins can manage outage wards"
on public.outage_wards for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
);

drop policy if exists "Admins can manage electricity notices" on public.electricity_notices;
create policy "Admins can manage electricity notices"
on public.electricity_notices for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'municipality_admin'
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
          or electricity_notices.ward_number = 0
          or p.ward_number = electricity_notices.ward_number
        )
    )
  )
);

-- Clean up any legacy ward_admin specific policies
drop policy if exists "Ward admins can view their ward reports" on public.problem_reports;
drop policy if exists "Ward admins can update their ward reports" on public.problem_reports;
drop policy if exists "Ward admins can manage their ward outages" on public.outages;
drop policy if exists "Ward admins can manage their ward notices" on public.electricity_notices;
drop policy if exists "Ward admins can insert their ward status history" on public.report_status_history;
drop policy if exists "Ward admins can view their ward report status history" on public.report_status_history;

-- ==============================================================================
-- Supabase Storage: problem-photos and report-photos buckets & RLS policies
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('problem-photos', 'problem-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('report-photos', 'report-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
on conflict (id) do update set
  file_size_limit = 20971520,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

drop policy if exists "Residents can upload report photos" on storage.objects;
create policy "Residents can upload report photos"
on storage.objects for insert
with check (
  bucket_id in ('problem-photos', 'report-photos')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Residents and Admins can view authorized report photos" on storage.objects;
create policy "Residents and Admins can view authorized report photos"
on storage.objects for select
using (
  bucket_id in ('problem-photos', 'report-photos')
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'municipality_admin'
    )
  )
);

drop policy if exists "Residents can update their own report photos" on storage.objects;
create policy "Residents can update their own report photos"
on storage.objects for update
using (
  bucket_id in ('problem-photos', 'report-photos')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('problem-photos', 'report-photos')
  and auth.uid()::text = (storage.foldername(name))[1]
);



