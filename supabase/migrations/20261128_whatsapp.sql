-- WhatsApp Business automation + auto-assign of website bookings. Safe to run more than once.
-- (The older whatsapp_messages table from the previous WhatsApp design is left alone; this uses its own wa_log table.)

-- every WhatsApp message sent or received through the new function
create table if not exists wa_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  direction text not null,          -- out | in
  wa_message_id text,
  to_phone text,                    -- out: recipient, in: sender (digits with country code)
  template text,
  body text,
  payload text,                     -- in: button payload, e.g. OFFER_ACCEPT:<job id>
  status text,                      -- out: sent | delivered | read | failed ; in: received
  error text,
  instructor_id text,
  referral_id text,
  student_name text,
  raw jsonb
);
create index if not exists wa_log_time_idx on wa_log (created_at desc);
create index if not exists wa_log_wa_idx on wa_log (wa_message_id);
alter table wa_log enable row level security;
drop policy if exists "anon_all_wa_log" on wa_log;
create policy "anon_all_wa_log" on wa_log for all using (true) with check (true);

-- one row per website booking the auto-assign engine is handling (the unique index stops two runs handling the same booking)
create table if not exists auto_assign_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  waiting_id text not null,
  state text not null default 'working',   -- working | pending_accept | assigned | attention | closed
  instructor_id text,
  attempt int default 1,
  tried jsonb default '[]'::jsonb,         -- instructors already asked
  expires_at timestamptz,                  -- when an unanswered offer runs out
  referral_id text,
  dist numeric,
  note text
);
create unique index if not exists auto_assign_jobs_waiting_idx on auto_assign_jobs (waiting_id);
create index if not exists auto_assign_jobs_state_idx on auto_assign_jobs (state);
alter table auto_assign_jobs enable row level security;
drop policy if exists "anon_all_auto_assign_jobs" on auto_assign_jobs;
create policy "anon_all_auto_assign_jobs" on auto_assign_jobs for all using (true) with check (true);

-- "attention required" items for the admin (an instructor can't cover, nobody replied, no match, a message failed…)
create table if not exists admin_attention (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text,                 -- no_match | declined | declined_after | no_reply | postcode | suggest | assign_failed | msg_failed
  title text,
  detail text,
  waiting_id text,
  referral_id text,
  instructor_id text,
  student_name text,
  resolved boolean not null default false,
  resolved_at timestamptz
);
create index if not exists admin_attention_open_idx on admin_attention (resolved, created_at desc);
alter table admin_attention enable row level security;
drop policy if exists "anon_all_admin_attention" on admin_attention;
create policy "anon_all_admin_attention" on admin_attention for all using (true) with check (true);
