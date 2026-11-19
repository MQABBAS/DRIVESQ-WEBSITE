-- Weekly fees from franchise instructors and package instructors (Normal / Silver / Gold / Platinum).
-- One row per instructor per week. Admin marks each week paid; paid rows count as income in Accounting (on the day they were paid).
-- Safe to run more than once.
create table if not exists instructor_weekly_fees (
  id uuid primary key default gen_random_uuid(),
  instructor_id text not null,
  week_start date not null,                 -- the Monday of the week
  plan text,                                -- e.g. Franchise, Platinum, Gold, Silver, Normal
  expected numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  status text not null default 'unpaid',    -- unpaid | paid | waived
  paid_at date,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists instructor_weekly_fees_uidx on instructor_weekly_fees (instructor_id, week_start);
create index if not exists instructor_weekly_fees_week_idx on instructor_weekly_fees (week_start);
alter table instructor_weekly_fees enable row level security;
drop policy if exists "anon_all_instructor_weekly_fees" on instructor_weekly_fees;
create policy "anon_all_instructor_weekly_fees" on instructor_weekly_fees for all using (true) with check (true);
