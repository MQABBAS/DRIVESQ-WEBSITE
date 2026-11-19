-- Block bookings v2: instructor can add/edit hours, admin can edit, every change is logged, and admin decides who can see a block.
-- Run once in Supabase → SQL Editor (after 20261114_student_credit.sql). Safe to run again.

alter table student_credit_ledger add column if not exists created_by_role text default 'admin';   -- admin | instructor
alter table student_credit_ledger add column if not exists created_by_name text;
alter table student_credit_ledger add column if not exists edited_by_role text;
alter table student_credit_ledger add column if not exists edited_by_name text;
alter table student_credit_ledger add column if not exists edited_at timestamptz;
alter table student_credit_ledger add column if not exists public_note text;                       -- shown to instructor + student (the private `note` stays admin-only)

alter table student_credit_settings add column if not exists show_to_instructor boolean not null default true;   -- admin switch: instructor can see/update this student's block
alter table student_credit_settings add column if not exists student_name text;
alter table student_credit_settings add column if not exists instructor_id text;

-- Full history of everything added / edited / used / deleted, and by whom.
create table if not exists student_credit_history (
  id uuid primary key default gen_random_uuid(),
  ledger_id text,
  student_key text,
  student_account_id text,
  student_profile_id text,
  student_name text,
  instructor_id text,
  action text not null,                 -- added | edited | used | deleted | visibility | reminder
  actor_role text not null default 'admin',   -- admin | instructor | student
  actor_name text,
  summary text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists student_credit_history_key_idx on student_credit_history (student_key, created_at desc);
create index if not exists student_credit_history_instr_idx on student_credit_history (instructor_id, created_at desc);
alter table student_credit_history enable row level security;
drop policy if exists "anon_all_student_credit_history" on student_credit_history;
create policy "anon_all_student_credit_history" on student_credit_history for all using (true) with check (true);
