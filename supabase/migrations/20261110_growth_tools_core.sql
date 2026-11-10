-- DriveSQ admin · Growth tools — core part only (no scheduled jobs). Run this if 20261023_growth_tools.sql was never run. Safe to run more than once.
-- Auto-chase + one-tap instructor replies, reply-time timer, lost-lead reasons, ad spend (profit by source),
-- settings (chase timings, franchise fees). Safe to run more than once.

-- 1. Referrals: chasing the instructor and what they replied
alter table referrals add column if not exists chase_count    int not null default 0;
alter table referrals add column if not exists last_chased_at timestamptz;
alter table referrals add column if not exists chase_channel  text;          -- email | app | whatsapp
alter table referrals add column if not exists reply_status   text;          -- booked | not_yet | unreachable | not_interested
alter table referrals add column if not exists reply_note     text;
alter table referrals add column if not exists replied_at     timestamptz;
alter table referrals add column if not exists lost_reason    text;          -- why the student didn't book

-- 2. Enquiries: when we first called / WhatsApped them, and why they were lost
alter table waiting_list add column if not exists first_contact_at timestamptz;
alter table waiting_list add column if not exists lost_reason      text;

-- 3. Monthly ad spend per channel (for profit by source)
create table if not exists ad_spend (
  month      date not null,                -- first day of the month
  channel    text not null,                -- e.g. Google Ads
  amount     numeric(10,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, channel)
);

-- 4. Settings shared across admin devices (chase timings, franchise fees …)
create table if not exists growth_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

alter table ad_spend enable row level security;
alter table growth_settings enable row level security;
drop policy if exists "anon_all_ad_spend" on ad_spend;
drop policy if exists "anon_all_growth_settings" on growth_settings;
create policy "anon_all_ad_spend" on ad_spend for all using (true) with check (true);
create policy "anon_all_growth_settings" on growth_settings for all using (true) with check (true);

-- 5. Today follow-ups table (already added on 22 Oct — repeated here in case it wasn't run)
create table if not exists admin_followups (
  key text primary key, until timestamptz, done boolean not null default false, note text, updated_at timestamptz not null default now()
);
alter table admin_followups enable row level security;
drop policy if exists "anon_all_admin_followups_g" on admin_followups;
create policy "anon_all_admin_followups_g" on admin_followups for all using (true) with check (true);
