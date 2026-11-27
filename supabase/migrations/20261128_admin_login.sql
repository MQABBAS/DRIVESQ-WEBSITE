-- Step 1 of 2 for the safer admin login. Safe to run now: it only ADDS things; nothing stops working.
alter table admins add column if not exists pw_hash text;

create table if not exists admin_login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  at timestamptz not null default now()
);
create index if not exists admin_login_attempts_idx on admin_login_attempts (email, at desc);
alter table admin_login_attempts enable row level security;   -- no policies: only the server function can touch it
