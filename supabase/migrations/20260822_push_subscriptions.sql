-- Push subscriptions for Web Push Notifications
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vwvbfqrlumvoabzkjxoa/editor

-- Drop and recreate cleanly (safe — no data in this table yet)
DROP TABLE IF EXISTS push_subscriptions;

CREATE TABLE push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instructor_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX push_subscriptions_instructor_idx ON push_subscriptions(instructor_id);
