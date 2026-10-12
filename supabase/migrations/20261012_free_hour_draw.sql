-- ══════════════════════════════════════════════════════════════════════
-- FREE HOUR DRAW — monthly prize draw for new DriveSQ students
-- Prize: FREE 1-hour driving lesson (£35 voucher), paid by DriveSQ.
--
-- Run once in the Supabase SQL Editor (safe to run again).
--
--   draw_entries   one ticket per student, created when admin clicks
--                  "Lesson booked" for that student. Belongs to the month
--                  the lesson was booked in.
--   draw_results   one row per draw (re-draws keep the old row, marked
--                  'redrawn'), plus the voucher that was issued.
--   draw_settings  single row (id = 1) with the draw's settings.
--   draw_public    view the public website reads: winners who agreed to
--                  be shown (first name + postcode district only).
-- ══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists draw_entries (
  id              uuid primary key default gen_random_uuid(),
  month           text not null,                    -- 'YYYY-MM' (UK time)
  ticket_no       text not null unique,             -- e.g. DSQ-2610-014
  waiting_list_id text,                             -- the website booking it came from
  student_name    text not null,
  student_phone   text,
  student_email   text,
  phone_key       text not null,                    -- digits only, for one-entry-per-person
  postcode        text,
  area            text,
  lesson_type     text,
  instructor_id   uuid,
  instructor_name text,
  first_lesson_at timestamptz,
  note            text,
  status          text not null default 'active',   -- active | removed | excluded
  status_reason   text,
  created_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists draw_entries_month_idx on draw_entries (month, status);
-- one live ticket per mobile number per month
create unique index if not exists draw_entries_one_per_phone
  on draw_entries (month, phone_key) where status = 'active';

create table if not exists draw_results (
  id               uuid primary key default gen_random_uuid(),
  month            text not null,
  draw_no          int  not null default 1,
  style            text,                           -- wheel | plate | scratch | balls
  drawn_at         timestamptz not null default now(),
  drawn_by         text,
  entry_count      int  not null default 0,
  entries_snapshot jsonb not null default '[]',    -- every ticket in the draw (proof)
  random_proof     text,                           -- random value used to pick the winner
  winner_entry_id  uuid references draw_entries(id) on delete set null,
  winner_ticket    text,
  winner_name      text,
  winner_phone     text,
  winner_postcode  text,
  instructor_id    uuid,
  instructor_name  text,
  status           text not null default 'won',    -- won | sent | used | expired | void | redrawn
  status_reason    text,
  voucher_code     text unique,
  voucher_amount   numeric(8,2) not null default 35,
  voucher_label    text default 'FREE 1-hour driving lesson',
  balance          numeric(8,2),
  expires_at       date,
  custom_message   text,
  sent_at          timestamptz,
  sent_via         text,
  used_at          timestamptz,
  used_lesson_date date,
  used_instructor  text,
  expense_id       text,
  show_on_site     boolean not null default false,
  public_name      text,
  log              jsonb not null default '[]',    -- every action taken on this draw/voucher
  created_at       timestamptz not null default now()
);
create index if not exists draw_results_month_idx on draw_results (month);

create table if not exists draw_settings (
  id                    int primary key default 1 check (id = 1),
  enabled               boolean not null default true,
  prize_amount          numeric(8,2) not null default 35,
  prize_label           text not null default 'FREE 1-hour driving lesson',
  winners_per_month     int not null default 1,
  default_expiry_months int not null default 6,
  banner_text           text,
  show_countdown        boolean not null default true,
  months                jsonb not null default '{}',  -- per-month overrides {"2026-12":{"prize":70,"winners":2,"paused":false}}
  updated_at            timestamptz not null default now()
);
insert into draw_settings (id) values (1) on conflict (id) do nothing;

-- Public, privacy-safe list of winners for the website
create or replace view draw_public as
  select month,
         coalesce(nullif(public_name, ''), split_part(winner_name, ' ', 1)) as name,
         split_part(coalesce(winner_postcode, ''), ' ', 1)                as district,
         voucher_amount,
         drawn_at
    from draw_results
   where show_on_site = true and status not in ('void', 'redrawn');

-- Same access model as the other DriveSQ tables (see fix-rls.sql)
do $$
declare t text; pol record;
begin
  foreach t in array array['draw_entries','draw_results','draw_settings'] loop
    execute format('alter table %I enable row level security', t);
    for pol in select policyname from pg_policies where tablename = t loop
      execute format('drop policy if exists %I on %I', pol.policyname, t);
    end loop;
    execute format('create policy "anon_select_%s" on %I for select using (true)', t, t);
    execute format('create policy "anon_insert_%s" on %I for insert with check (true)', t, t);
    execute format('create policy "anon_update_%s" on %I for update using (true) with check (true)', t, t);
    execute format('create policy "anon_delete_%s" on %I for delete using (true)', t, t);
  end loop;
end $$;

grant select on draw_public to anon, authenticated;
grant all on draw_entries, draw_results, draw_settings to anon, authenticated;
