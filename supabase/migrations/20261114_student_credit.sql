-- Student block payments & credit ledger (admin records; the portal shows it only if "show on portal" is ticked)
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
