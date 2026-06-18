-- ══════════════════════════════════════════════════════
-- DriveSQ COMPLETE DATABASE SCHEMA
-- Run in Supabase SQL Editor (safe to re-run)
-- ══════════════════════════════════════════════════════

-- 1. ADMINS
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

-- 2. INSTRUCTORS
CREATE TABLE IF NOT EXISTS instructors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  badge_number TEXT,
  badge_type TEXT DEFAULT 'ADI',
  phone TEXT,
  email TEXT,
  address TEXT,
  area TEXT,
  car_model TEXT,
  car_plate TEXT,
  car_type TEXT DEFAULT 'Dual Control',
  status TEXT DEFAULT 'pending',
  password TEXT,
  password_hash TEXT,
  profile_photo_url TEXT,
  badge_photo_url TEXT,
  car_photo_url TEXT,
  show_lessons BOOLEAN DEFAULT true,
  hidden BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STUDENT ACCOUNTS (the main student auth table)
CREATE TABLE IF NOT EXISTS student_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  password_hash TEXT,
  pin TEXT,
  student_code TEXT,
  profile_photo_url TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT DEFAULT 'pending',
  notification_lesson_sms BOOLEAN DEFAULT false,
  notification_msg_sms BOOLEAN DEFAULT false,
  notification_progress_sms BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STUDENT PROFILES (instructor-side roster)
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  lesson_type TEXT DEFAULT 'Manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LESSONS
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE SET NULL,
  lesson_date DATE NOT NULL,
  start_time TEXT,
  duration_hours NUMERIC DEFAULT 1,
  full_name TEXT,
  student_name TEXT,
  student_phone TEXT,
  pickup_address TEXT,
  lesson_type TEXT DEFAULT 'Manual',
  notes TEXT,
  payment_received NUMERIC DEFAULT 0,
  payment_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. STUDENT PROGRESS
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  total_hours_done NUMERIC DEFAULT 0,
  target_hours NUMERIC DEFAULT 20,
  test_readiness TEXT DEFAULT 'Not Ready',
  test_ready BOOLEAN DEFAULT false,
  mock_test_score INTEGER,
  overall_notes TEXT,
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_account_id, instructor_id)
);

-- 7. STUDENT TOPIC RATINGS
CREATE TABLE IF NOT EXISTS student_topic_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  topic_group TEXT,
  topic_name TEXT NOT NULL,
  rating INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_account_id, instructor_id, topic_name)
);

-- 8. STUDENT TEST DATES
CREATE TABLE IF NOT EXISTS student_test_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  theory_test_date DATE,
  practical_test_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_account_id)
);

-- 9. STUDENT THEORY PROGRESS (checkbox ticks)
CREATE TABLE IF NOT EXISTS student_theory_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  is_ticked BOOLEAN DEFAULT false,
  ticked_at TIMESTAMPTZ,
  UNIQUE(student_account_id, topic_name)
);

-- 10. STUDENT MESSAGES (chat between student & instructor)
CREATE TABLE IF NOT EXISTS student_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ
);

-- 11. STUDENT LINK EVENTS (tracking invite link usage)
CREATE TABLE IF NOT EXISTS student_link_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID,
  instructor_id UUID,
  student_code TEXT,
  event_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. STUDENT LESSON FEEDBACK
CREATE TABLE IF NOT EXISTS student_lesson_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  rating INTEGER,
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 13. LESSON CONFIRMATIONS
CREATE TABLE IF NOT EXISTS lesson_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  student_confirmed BOOLEAN DEFAULT false,
  student_confirmed_at TIMESTAMPTZ,
  instructor_confirmed BOOLEAN DEFAULT false,
  instructor_confirmed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. LESSON REMINDERS
CREATE TABLE IF NOT EXISTS lesson_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  reminder_type TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 15. RESCHEDULE REQUESTS
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  original_date DATE,
  original_time TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  full_name TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. STUDENT REQUESTS (new student enquiries)
CREATE TABLE IF NOT EXISTS student_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  student_name TEXT,
  student_phone TEXT,
  full_name TEXT,
  postcode TEXT,
  pickup_address TEXT,
  lesson_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  lesson_id UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. INSTRUCTOR CHANGE REQUESTS
CREATE TABLE IF NOT EXISTS instructor_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  current_instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  full_name TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. TRANSFER REQUESTS
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  to_instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  student_name TEXT,
  student_phone TEXT,
  full_name TEXT,
  pickup_address TEXT,
  lesson_type TEXT,
  from_instructor TEXT,
  to_instructor TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. ADMIN MESSAGES
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT,
  message_type TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════
-- RPC FUNCTIONS (drop existing to avoid return-type conflicts)
-- ══════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS seed_student_progress(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS seed_student_topics(UUID, UUID);
DROP FUNCTION IF EXISTS get_or_create_student_account(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_student_progress(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_topic_rating(UUID, UUID, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS reset_instructor_password(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION seed_student_progress(p_student_id UUID, p_instructor_id UUID, p_target_hours NUMERIC DEFAULT 20)
RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (student_account_id, student_id, instructor_id, target_hours, total_hours_done, test_readiness, test_ready, created_at, last_updated)
  VALUES (p_student_id, p_student_id, p_instructor_id, p_target_hours, 0, 'Not Ready', false, now(), now())
  ON CONFLICT (student_account_id, instructor_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_student_topics(p_student_id UUID, p_instructor_id UUID)
RETURNS VOID AS $$
DECLARE
  topics TEXT[] := ARRAY[
    'Cockpit Checks','Moving Off & Stopping','Steering Control','Use of Mirrors','Use of Signals',
    'Junctions','Roundabouts','Crossroads','Pedestrian Crossings','Dual Carriageways',
    'Turn in the Road','Reverse Left','Reverse Right','Parallel Park','Bay Parking (Forward)',
    'Bay Parking (Reverse)','Emergency Stop','Hill Start','Meeting Traffic','Overtaking',
    'Independent Driving','Show Me Tell Me'
  ];
  groups TEXT[] := ARRAY[
    'Controls','Controls','Controls','Controls','Controls',
    'Road Procedure','Road Procedure','Road Procedure','Road Procedure','Road Procedure',
    'Manoeuvres','Manoeuvres','Manoeuvres','Manoeuvres','Manoeuvres',
    'Manoeuvres','Manoeuvres','Manoeuvres','Road Procedure','Road Procedure',
    'Test Preparation','Test Preparation'
  ];
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(topics, 1) LOOP
    INSERT INTO student_topic_ratings (student_account_id, student_id, instructor_id, topic_group, topic_name, rating, created_at)
    VALUES (p_student_id, p_student_id, p_instructor_id, groups[i], topics[i], 0, now())
    ON CONFLICT (student_account_id, instructor_id, topic_name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_or_create_student_account(p_instructor_id UUID, p_full_name TEXT, p_phone TEXT DEFAULT '')
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  SELECT id INTO v_id FROM student_accounts
  WHERE instructor_id = p_instructor_id AND lower(full_name) = lower(p_full_name)
  LIMIT 1;

  IF v_id IS NULL THEN
    v_code := upper(substr(md5(random()::text), 1, 5));
    INSERT INTO student_accounts (instructor_id, full_name, phone, student_code, pin, password_hash, status, created_at, updated_at)
    VALUES (p_instructor_id, p_full_name, p_phone, v_code, '', '', 'pending', now(), now())
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_student_progress(p_student_id UUID, p_instructor_id UUID, p_hours_done NUMERIC, p_target_hours NUMERIC, p_readiness TEXT, p_notes TEXT DEFAULT '')
RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (student_account_id, student_id, instructor_id, total_hours_done, target_hours, test_readiness, overall_notes, notes, created_at, last_updated)
  VALUES (p_student_id, p_student_id, p_instructor_id, p_hours_done, p_target_hours, p_readiness, p_notes, p_notes, now(), now())
  ON CONFLICT (student_account_id, instructor_id)
  DO UPDATE SET total_hours_done = p_hours_done, target_hours = p_target_hours, test_readiness = p_readiness, overall_notes = p_notes, notes = p_notes, last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_topic_rating(p_student_id UUID, p_instructor_id UUID, p_group TEXT, p_topic TEXT, p_rating INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO student_topic_ratings (student_account_id, student_id, instructor_id, topic_group, topic_name, rating, created_at)
  VALUES (p_student_id, p_student_id, p_instructor_id, p_group, p_topic, p_rating, now())
  ON CONFLICT (student_account_id, instructor_id, topic_name)
  DO UPDATE SET rating = p_rating, topic_group = p_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reset_instructor_password(p_badge_number TEXT, p_phone TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM instructors WHERE badge_number = p_badge_number AND phone = p_phone LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE instructors SET password = p_new_password, password_hash = encode(p_new_password::bytea, 'base64') WHERE id = v_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('instructor-photos', 'instructor-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "Public read instructor photos" ON storage.objects FOR SELECT USING (bucket_id = 'instructor-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can upload instructor photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'instructor-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can update instructor photos" ON storage.objects FOR UPDATE USING (bucket_id = 'instructor-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can delete instructor photos" ON storage.objects FOR DELETE USING (bucket_id = 'instructor-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can upload student photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can update student photos" ON storage.objects FOR UPDATE USING (bucket_id = 'student-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can delete student photos" ON storage.objects FOR DELETE USING (bucket_id = 'student-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Allow all (open access via anon key)
-- ══════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'admins','instructors','lessons','student_accounts','student_profiles',
    'student_progress','student_topic_ratings','student_test_dates',
    'student_theory_progress','student_messages','student_link_events',
    'student_lesson_feedback','lesson_confirmations','lesson_reminders',
    'reschedule_requests','student_requests','instructor_change_requests',
    'transfer_requests','admin_messages'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY "Allow all for %s" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════
-- ADD MISSING COLUMNS (safe to re-run on existing tables)
-- ══════════════════════════════════════════════════════

ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS notification_lesson_sms BOOLEAN DEFAULT false;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS notification_msg_sms BOOLEAN DEFAULT false;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS notification_progress_sms BOOLEAN DEFAULT false;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS car_model TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS car_plate TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS car_type TEXT DEFAULT 'Dual Control';
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS badge_photo_url TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS car_photo_url TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS student_account_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'Manual';
ALTER TABLE student_test_dates ADD COLUMN IF NOT EXISTS theory_test_date DATE;
ALTER TABLE student_test_dates ADD COLUMN IF NOT EXISTS practical_test_date DATE;
ALTER TABLE student_lesson_feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reschedule_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS test_ready BOOLEAN DEFAULT false;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS mock_test_score INTEGER;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE student_topic_ratings ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE student_messages ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE student_messages ADD COLUMN IF NOT EXISTS subject TEXT;

-- ══════════════════════════════════════════════════════
-- CREATE YOUR ADMIN ACCOUNT
-- Change the email and password below to your own!
-- ══════════════════════════════════════════════════════

INSERT INTO admins (email, password_hash)
VALUES ('admin@drivesq.co.uk', encode('admin123'::bytea, 'base64'))
ON CONFLICT (email) DO NOTHING;

-- ══════════════════════════════════════════════════════
-- DONE! Your DriveSQ app should now work fully.
-- Go to admin.html, login with admin@drivesq.co.uk / admin123
-- Then change your password from the app.
-- ══════════════════════════════════════════════════════
