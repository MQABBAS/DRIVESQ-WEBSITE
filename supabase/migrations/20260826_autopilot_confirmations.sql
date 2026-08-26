-- Add confirmation columns to waiting_list for autopilot booking confirmation flow
ALTER TABLE waiting_list
  ADD COLUMN IF NOT EXISTS confirm_token TEXT,
  ADD COLUMN IF NOT EXISTS confirm_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS next_candidates JSONB,
  ADD COLUMN IF NOT EXISTS instructor_id TEXT,
  ADD COLUMN IF NOT EXISTS confirm_responded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_waiting_list_confirm_token ON waiting_list(confirm_token);
CREATE INDEX IF NOT EXISTS idx_waiting_list_confirm_status ON waiting_list(confirm_status);
