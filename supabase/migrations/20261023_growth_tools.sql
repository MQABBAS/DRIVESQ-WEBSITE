-- DriveSQ admin · Growth tools
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

-- 6. Weekly summary to your phone every Monday morning, even when admin isn't open.
--    Uses Supabase's built-in pg_cron and pg_net. If either line below errors, turn them on in
--    Supabase → Database → Extensions (search "pg_cron" and "pg_net"), then run this file again.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function dsq_weekly_summary() returns text
language plpgsql security definer as $$
declare
  since    timestamptz := now() - interval '7 days';
  enq      int; refd int; booked int; owed numeric; owed_n int; worst text; msg text; wk text := to_char(now(), 'IYYY-IW');
begin
  select count(*) into enq from waiting_list where created_at >= since;
  select count(*) into refd from referrals where created_at >= since and not coalesce(is_cancelled,false) and not coalesce(is_credit,false);
  select count(*) into booked from referrals where is_paid and coalesce(paid_at, created_at) >= since;
  select coalesce(sum(amount),0), count(*) into owed, owed_n from referrals
    where not is_paid and not coalesce(is_cancelled,false) and not coalesce(is_credit,false) and created_at < now() - interval '3 days';
  select i.full_name into worst from referrals r join instructors i on i.id = r.instructor_id
    where not r.is_paid and not coalesce(r.is_cancelled,false) and not coalesce(r.is_credit,false)
      and r.created_at < now() - interval '7 days' and coalesce(i.instructor_model,'') <> 'franchise'
    group by i.full_name order by count(*) desc, min(r.created_at) limit 1;
  msg := enq || ' enquiries · ' || refd || ' referred · ' || booked || ' booked. £' || round(owed) || ' outstanding (' || owed_n || ')'
         || coalesce('. Chase first: ' || worst, '') || '.';
  perform net.http_post(
    url := 'https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiemtqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ4MzgsImV4cCI6MjA5Njc1MDgzOH0.c5UNle-sh1DYuyqaNYvG9r9ru74EMP89uhdteQu2qho'),
    body := jsonb_build_object('instructor_id','00000000-0000-0000-0000-000000000001',
      'title','📊 DriveSQ weekly summary','body',msg,'url','/admin.html#growth','tag','drivesq-weekly-' || wk));
  insert into admin_followups(key, note, done, updated_at) values ('weekly:' || wk, msg, true, now())
    on conflict (key) do update set note = excluded.note, updated_at = now();
  return msg;
end $$;

-- Mondays 07:00 UTC (8am in summer, 7am in winter)
select cron.unschedule('dsq-weekly-summary') where exists (select 1 from cron.job where jobname = 'dsq-weekly-summary');
select cron.schedule('dsq-weekly-summary', '0 7 * * 1', 'select dsq_weekly_summary()');
