-- WhatsApp Business (Meta Cloud API): every message DriveSQ sends or receives is logged here.
-- Safe to run more than once.
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  direction text not null,          -- out | in
  wa_message_id text,               -- Meta's message id (used to attach delivery receipts)
  to_phone text,                    -- out: recipient, in: sender (digits, e.g. 447700900123)
  template text,                    -- out: template name
  body text,                        -- readable text (or the template parameters)
  payload text,                     -- in: button payload, e.g. ACCEPT:<referral id>
  status text,                      -- out: sent | delivered | read | failed ; in: received
  error text,
  instructor_id text,
  referral_id text,
  student_name text,
  raw jsonb
);
create index if not exists whatsapp_messages_time_idx on whatsapp_messages (created_at desc);
create index if not exists whatsapp_messages_wa_idx on whatsapp_messages (wa_message_id);
create index if not exists whatsapp_messages_ref_idx on whatsapp_messages (referral_id);
alter table whatsapp_messages enable row level security;
drop policy if exists "anon_all_whatsapp_messages" on whatsapp_messages;
create policy "anon_all_whatsapp_messages" on whatsapp_messages for all using (true) with check (true);
