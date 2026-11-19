-- Everything is logged: one table for admin and instructor actions (marks, package changes, income/expenses, graph decisions).
-- Safe to run more than once.
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  area text,                 -- referral | package | income | expense | block | instructor | student
  action text,               -- e.g. marked_booked, marked_left, package_changed, income_added
  summary text,
  actor_role text,           -- admin | instructor | system
  actor_name text,
  instructor_id text,
  student_name text,
  ref_id text,
  before jsonb,
  after jsonb
);
create index if not exists admin_activity_log_time_idx on admin_activity_log (created_at desc);
create index if not exists admin_activity_log_instr_idx on admin_activity_log (instructor_id, created_at desc);
alter table admin_activity_log enable row level security;
drop policy if exists "anon_all_admin_activity_log" on admin_activity_log;
create policy "anon_all_admin_activity_log" on admin_activity_log for all using (true) with check (true);
