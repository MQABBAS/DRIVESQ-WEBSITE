-- DriveSQ Theory — standalone theory-test app schema
-- Run this once in the Supabase SQL editor for the existing DriveSQ project.
-- Keyed to Supabase Auth (auth.users) — separate from student_accounts,
-- since most DriveSQ Theory users won't be DriveSQ driving-lesson students.

create table if not exists theory_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  streak_freezes integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists theory_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null,
  category text not null,
  mode text not null check (mode in ('practice','mock')),
  test_num integer,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists theory_attempts_user_idx on theory_attempts(user_id);
create index if not exists theory_attempts_user_cat_idx on theory_attempts(user_id, category);

create table if not exists theory_mock_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  test_num integer not null,
  score integer not null,
  total integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists theory_mock_results_user_idx on theory_mock_results(user_id);

alter table theory_streaks enable row level security;
alter table theory_attempts enable row level security;
alter table theory_mock_results enable row level security;

create policy "own streak row" on theory_streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own attempts" on theory_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own mock results" on theory_mock_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
