-- Push subscriptions for Web Push Notifications
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/vwvbfqrlumvoabzkjxoa/editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid REFERENCES instructors(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instructor_id, endpoint)
);

-- Allow instructors to manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can upsert own subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups by instructor
CREATE INDEX IF NOT EXISTS push_subscriptions_instructor_idx ON push_subscriptions(instructor_id);
