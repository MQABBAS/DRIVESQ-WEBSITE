-- Run this in Supabase SQL Editor to set up notifications

-- Pending notifications table
CREATE TABLE IF NOT EXISTS pending_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'DriveSQ',
  body TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pending_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert notifications"
  ON pending_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read notifications"
  ON pending_notifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update notifications"
  ON pending_notifications FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pending_notifs_student ON pending_notifications(student_account_id, is_read);

-- Auto-delete read notifications older than 7 days (optional cleanup)
-- You can run this manually or set up a cron job in Supabase
-- DELETE FROM pending_notifications WHERE is_read = true AND created_at < now() - interval '7 days';
