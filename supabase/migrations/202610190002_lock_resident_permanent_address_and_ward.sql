-- Migration 202610190002: Enforce resident permanent address lock, verified signup status, and DB update protection

-- 1. Ensure permanent_address_status column exists with proper constraints
alter table public.profiles
  add column if not exists permanent_address_status text default 'verification_required';

alter table public.profiles
  drop constraint if exists profiles_permanent_address_status_check;

alter table public.profiles
  add constraint profiles_permanent_address_status_check
  check (permanent_address_status in ('verified', 'verification_required'));

-- 2. Ensure existing residents with valid ward and address are marked as verified
update public.profiles p
set
  permanent_address_status = 'verified',
  updated_at = now()
where p.role = 'resident'
  and nullif(btrim(p.permanent_address), '') is not null
  and p.ward_number between 1 and 19
  and (p.permanent_address_status is null or p.permanent_address_status <> 'verified');

-- 3. Hardened validate_resident_profile() trigger function
create or replace function public.validate_resident_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and current_user <> 'postgres' then
    -- Enforce immutability of core municipal resident identity
    if old.role = 'resident' then
      if new.role is distinct from old.role then
        raise exception 'Role cannot be changed directly.';
      end if;
      if new.municipality_id is distinct from old.municipality_id then
        raise exception 'Permanent municipality cannot be modified. Contact municipality administration.';
      end if;
      if new.ward_number is distinct from old.ward_number then
        raise exception 'Permanent ward cannot be modified directly. An authorized municipality correction is required.';
      end if;
      if new.ward_id is distinct from old.ward_id then
        raise exception 'Permanent ward cannot be modified directly.';
      end if;
      if new.permanent_address is distinct from old.permanent_address then
        raise exception 'Permanent address is locked after signup. An authorized municipality correction is required.';
      end if;
      if new.permanent_address_status is distinct from old.permanent_address_status then
        raise exception 'Address verification status cannot be modified directly.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_resident_profile_data on public.profiles;
create trigger enforce_resident_profile_data
before insert or update on public.profiles
for each row execute function public.validate_resident_profile();

-- 4. Column-level permissions: prevent direct API updates to locked columns
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

-- 5. Row-level security for profile updates
drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and (
    role = 'municipality_admin'
    or (
      ward_number is not distinct from (select p.ward_number from public.profiles p where p.id = auth.uid())
      and municipality_id is not distinct from (select p.municipality_id from public.profiles p where p.id = auth.uid())
      and permanent_address is not distinct from (select p.permanent_address from public.profiles p where p.id = auth.uid())
    )
  )
);

-- 6. Trigger for new user signup: saves ward and address as verified and immutable
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
  raw_addr text;
  addr_status text := 'verification_required';
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

  raw_addr := nullif(btrim(new.raw_user_meta_data ->> 'permanent_address'), '');

  -- When signed up with confirmed valid address and ward, mark as verified
  if mun_id is not null and w_num is not null and w_num between 1 and 19 and raw_addr is not null and length(raw_addr) >= 3 then
    addr_status := 'verified';
  end if;

  insert into public.profiles (
    id, full_name, phone, role, municipality_id, ward_id, ward_number,
    permanent_address, permanent_address_status, is_active, created_at, updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Resident'),
    new.raw_user_meta_data ->> 'phone_number',
    coalesce(new.raw_user_meta_data ->> 'role', 'resident'),
    mun_id,
    w_id,
    w_num,
    raw_addr,
    addr_status,
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    -- Once set, never overwrite existing permanent location via signup conflict
    municipality_id = coalesce(public.profiles.municipality_id, excluded.municipality_id),
    ward_id = coalesce(public.profiles.ward_id, excluded.ward_id),
    ward_number = coalesce(public.profiles.ward_number, excluded.ward_number),
    permanent_address = coalesce(public.profiles.permanent_address, excluded.permanent_address),
    permanent_address_status = coalesce(public.profiles.permanent_address_status, excluded.permanent_address_status),
    updated_at = now();

  return new;
end;
$$;
