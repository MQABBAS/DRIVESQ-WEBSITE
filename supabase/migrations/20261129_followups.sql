-- Follow-ups: after an instructor accepts a student, ask the STUDENT (3 days later) and then the INSTRUCTOR whether a lesson is booked.
-- Every answer updates the referral in admin. Safe to run more than once.
create table if not exists student_followups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  referral_id text not null,
  instructor_id text,
  student_name text,
  student_phone text,
  state text not null default 'waiting_accept',  -- waiting_accept | waiting_student | asked_student | asked_instructor | done | attention | closed
  round int not null default 1,
  accepted_at timestamptz,
  student_asked_at timestamptz,
  next_due timestamptz,
  result text
);
create unique index if not exists student_followups_ref_idx on student_followups (referral_id);
create index if not exists student_followups_due_idx on student_followups (state, next_due);
alter table student_followups enable row level security;
drop policy if exists "anon_all_student_followups" on student_followups;
create policy "anon_all_student_followups" on student_followups for all using (true) with check (true);
