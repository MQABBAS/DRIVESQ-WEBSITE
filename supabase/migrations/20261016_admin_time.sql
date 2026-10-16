create table if not exists admin_sessions (
  id              uuid primary key default gen_random_uuid(),
  admin_email     text,
  device          text,
  started_at      timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  active_seconds  int not null default 0
);
create index if not exists admin_sessions_started_idx on admin_sessions (started_at desc);

alter table admin_sessions enable row level security;
drop policy if exists "anon_select_admin_sessions" on admin_sessions;
drop policy if exists "anon_insert_admin_sessions" on admin_sessions;
drop policy if exists "anon_update_admin_sessions" on admin_sessions;
create policy "anon_select_admin_sessions" on admin_sessions for select using (true);
create policy "anon_insert_admin_sessions" on admin_sessions for insert with check (true);
create policy "anon_update_admin_sessions" on admin_sessions for update using (true) with check (true);
