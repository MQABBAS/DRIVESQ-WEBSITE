-- WhatsApp message log — stores both inbound (replies from instructors/students)
-- and outbound (messages sent by admin/autopilot) for the admin inbox.

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id           BIGSERIAL PRIMARY KEY,
  wa_message_id TEXT UNIQUE,          -- Meta message ID (dedup)
  from_number  TEXT,                   -- sender phone (digits only, with country code)
  to_number    TEXT,                   -- recipient phone
  body         TEXT,                   -- message text
  direction    TEXT DEFAULT 'inbound', -- 'inbound' | 'outbound'
  contact_name TEXT,                   -- display name matched from instructors/students
  contact_type TEXT,                   -- 'instructor' | 'student' | 'unknown'
  contact_id   TEXT,                   -- instructor/student id if matched
  processed    BOOLEAN DEFAULT FALSE,  -- has the webhook processed any actions from this?
  raw_payload  JSONB,                  -- full Meta webhook payload (inbound only)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_from   ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_wa_messages_dir    ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_wa_messages_ts     ON whatsapp_messages(created_at DESC);

-- Allow anon read/write (admin uses anon key)
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_messages_all" ON whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
