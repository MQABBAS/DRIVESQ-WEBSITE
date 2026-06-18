-- ══════════════════════════════════════════════════════
-- FIX: Ensure all tables allow read/write via anon key
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- Drop any restrictive policies and recreate open ones
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'admins','instructors','lessons','student_accounts','student_profiles',
    'student_progress','student_topic_ratings','student_test_dates',
    'student_theory_progress','student_messages','student_link_events',
    'student_lesson_feedback','lesson_confirmations','lesson_reminders',
    'reschedule_requests','student_requests','instructor_change_requests',
    'transfer_requests','admin_messages'
  ]) LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Drop ALL existing policies on this table
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;

    -- Create open SELECT policy
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %I FOR SELECT USING (true)', t, t);
    -- Create open INSERT policy
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT WITH CHECK (true)', t, t);
    -- Create open UPDATE policy
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE USING (true) WITH CHECK (true)', t, t);
    -- Create open DELETE policy
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

-- Grant usage to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verify: this should return rows for every table
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('student_accounts','lessons','instructors','student_profiles')
ORDER BY tablename, policyname;
