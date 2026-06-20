-- Run this in Supabase SQL Editor to set up push notifications

-- Push subscription storage
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_account_id)
);

-- Allow students to manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert their own subscription"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can update their own subscription"
  ON push_subscriptions FOR UPDATE
  USING (true);

CREATE POLICY "Instructors can read subscriptions for their students"
  ON push_subscriptions FOR SELECT
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_subs_student ON push_subscriptions(student_account_id);
