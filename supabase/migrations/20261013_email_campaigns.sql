-- ══════════════════════════════════════════════════════════════════════
-- EMAIL CAMPAIGNS — send branded emails to customers in batches from admin
-- Run once in the Supabase SQL Editor (safe to run again).
--
--   email_contacts   everyone you can email (imported from admin or added by hand),
--                    with their unsubscribe status
--   email_campaigns  each email you create / send
--   email_sends      one row per recipient per campaign (pending → sent / failed / skipped)
--
-- Sending happens in the "send-email" Edge Function (supabase/functions/send-email),
-- which uses the service-role key and Resend. It also handles unsubscribe links.
-- ══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists email_contacts (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  email_key        text generated always as (lower(trim(email))) stored,
  name             text,
  phone            text,
  sources          text[] not null default '{}',   -- students, bookings, draw, instructors, manual, import
  tags             text[] not null default '{}',
  status           text not null default 'subscribed',  -- subscribed | unsubscribed | bounced
  unsubscribed_at  timestamptz,
  unsubscribe_note text,
  consent_note     text,                             -- how we got the address (e.g. "Booked lessons — soft opt-in")
  last_sent_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists email_contacts_email_key on email_contacts (email_key);

create table if not exists email_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  subject       text not null,
  preheader     text,
  design        jsonb not null default '{}',   -- everything needed to rebuild the email in the editor
  html          text,                          -- final HTML (with {{first_name}} / {{unsubscribe_url}} tokens)
  text_body     text,
  status        text not null default 'draft', -- draft | sending | paused | sent | cancelled
  audience      jsonb not null default '{}',
  total         int not null default 0,
  sent_count    int not null default 0,
  failed_count  int not null default 0,
  skipped_count int not null default 0,
  batch_size    int not null default 50,
  batch_pause   int not null default 2,
  created_by    text,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  updated_at    timestamptz not null default now()
);

create table if not exists email_sends (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references email_campaigns(id) on delete cascade,
  contact_id   uuid references email_contacts(id) on delete set null,
  email        text not null,
  name         text,
  status       text not null default 'pending',  -- pending | sent | failed | skipped
  provider_id  text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists email_sends_campaign_idx on email_sends (campaign_id, status);
create unique index if not exists email_sends_once on email_sends (campaign_id, lower(email));

-- Same access model as the other DriveSQ tables (see fix-rls.sql)
do $$
declare t text; pol record;
begin
  foreach t in array array['email_contacts','email_campaigns','email_sends'] loop
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

grant all on email_contacts, email_campaigns, email_sends to anon, authenticated;

-- ── Saved email templates (added later — safe to run the whole file again) ──
create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  design      jsonb not null default '{}',
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table email_templates enable row level security;
drop policy if exists "anon_all_email_templates" on email_templates;
create policy "anon_all_email_templates" on email_templates for all using (true) with check (true);
grant all on email_templates to anon, authenticated;
