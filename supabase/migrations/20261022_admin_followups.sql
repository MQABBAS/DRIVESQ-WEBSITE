-- DriveSQ admin · Today follow-ups: snoozes, "done" marks and notes shared across all your devices
-- Safe to run more than once.
create table if not exists admin_followups (
  key        text primary key,          -- which follow-up, e.g. booking:<id>, fee:<instructor id>
  until      timestamptz,               -- hidden until this time (snoozed / done)
  done       boolean not null default false,
  note       text,
  updated_at timestamptz not null default now()
);

alter table admin_followups enable row level security;
drop policy if exists "anon_select_admin_followups" on admin_followups;
drop policy if exists "anon_insert_admin_followups" on admin_followups;
drop policy if exists "anon_update_admin_followups" on admin_followups;
drop policy if exists "anon_delete_admin_followups" on admin_followups;
create policy "anon_select_admin_followups" on admin_followups for select using (true);
create policy "anon_insert_admin_followups" on admin_followups for insert with check (true);
create policy "anon_update_admin_followups" on admin_followups for update using (true) with check (true);
create policy "anon_delete_admin_followups" on admin_followups for delete using (true);
