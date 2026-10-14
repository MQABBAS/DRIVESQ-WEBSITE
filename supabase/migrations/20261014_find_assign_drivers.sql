-- DriveSQ admin · Find & Assign: instructor notes + other (non-DriveSQ) drivers
-- Safe to run more than once.

-- 1. A private note on each DriveSQ instructor, shown on their card in Find & Assign
alter table instructors add column if not exists assign_note text;

-- 2. Drivers / instructors who are NOT DriveSQ instructors, with your own label
create table if not exists external_drivers (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  phone              text,
  base_postcode      text,                       -- where they're based, e.g. M20 4AB or just M20
  coverage_postcodes text,                       -- areas they cover, e.g. M19, M20, SK4
  car_type           text not null default 'Manual',   -- Manual | Automatic | Both
  label              text not null default 'Not DriveSQ',  -- your label, e.g. Partner, Freelance ADI
  notes              text,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table external_drivers enable row level security;
drop policy if exists "anon_select_external_drivers" on external_drivers;
drop policy if exists "anon_insert_external_drivers" on external_drivers;
drop policy if exists "anon_update_external_drivers" on external_drivers;
drop policy if exists "anon_delete_external_drivers" on external_drivers;
create policy "anon_select_external_drivers" on external_drivers for select using (true);
create policy "anon_insert_external_drivers" on external_drivers for insert with check (true);
create policy "anon_update_external_drivers" on external_drivers for update using (true) with check (true);
create policy "anon_delete_external_drivers" on external_drivers for delete using (true);
