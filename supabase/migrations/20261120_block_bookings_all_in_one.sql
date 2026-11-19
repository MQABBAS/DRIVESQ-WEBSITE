-- DriveSQ block bookings — ONE script with everything (safe to run more than once). Supabase → SQL Editor → paste → Run.

create table if not exists student_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  student_account_id text,
  student_profile_id text,
  student_name text,
  instructor_id text,
  kind text not null default 'purchase',        -- purchase | lesson | adjust
  hours numeric(7,2) not null default 0,         -- signed: + added, - used
  amount numeric(10,2) not null default 0,       -- signed pounds: + paid in, - used
  instructor_paid numeric(10,2),                 -- what you paid the instructor for that lesson (admin only)
  method text,
  reference text,
  note text,                                     -- private note (never shown on the portal)
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by text default 'admin'
);
create index if not exists student_credit_ledger_acct_idx on student_credit_ledger (student_account_id);
create index if not exists student_credit_ledger_prof_idx on student_credit_ledger (student_profile_id);
alter table student_credit_ledger enable row level security;
drop policy if exists "anon_all_student_credit_ledger" on student_credit_ledger;
create policy "anon_all_student_credit_ledger" on student_credit_ledger for all using (true) with check (true);

create table if not exists student_credit_settings (
  student_key text primary key,                  -- the student's portal account id (or 'p:<profile id>' if no account yet)
  show_on_portal boolean not null default false, -- OFF by default: the student sees nothing unless you tick it
  updated_at timestamptz not null default now()
);
alter table student_credit_settings enable row level security;
drop policy if exists "anon_all_student_credit_settings" on student_credit_settings;
create policy "anon_all_student_credit_settings" on student_credit_settings for all using (true) with check (true);


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

-- Calendar sync: each calendar lesson is counted once against a block
alter table student_credit_ledger add column if not exists lesson_id text;
alter table student_credit_ledger add column if not exists lesson_date date;
alter table student_credit_ledger add column if not exists auto boolean not null default false;        -- created from the calendar
alter table student_credit_ledger add column if not exists excluded boolean not null default false;    -- instructor chose "don't count this lesson"
alter table student_credit_ledger add column if not exists overridden boolean not null default false;  -- hours changed by hand, so the calendar leaves them alone
create unique index if not exists student_credit_ledger_lesson_uidx on student_credit_ledger (lesson_id) where lesson_id is not null;
create index if not exists student_credit_ledger_instr_idx on student_credit_ledger (instructor_id, entry_date);
