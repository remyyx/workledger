-- ============================================
-- Migration 012: Dispute Events (escalation logging)
-- ============================================
-- Adds a dispute_events table to track every status change,
-- review action, and escalation in the dispute lifecycle.
-- Supports transition to community arbitration (Phase 2)
-- by preserving a complete audit trail.

CREATE TABLE dispute_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES users(id),          -- NULL for system-generated events
  action TEXT NOT NULL CHECK (action IN (
    'opened',              -- dispute raised
    'evidence_submitted',  -- party uploaded evidence
    'escalated_to_review', -- moved from evidence to admin review
    'assigned_reviewer',   -- admin or arbitrator assigned
    'review_comment',      -- reviewer left internal note
    'resolution_proposed', -- reviewer proposes outcome
    'resolved',            -- final resolution applied
    'reopened',            -- resolution contested, dispute reopened
    'cancelled'            -- dispute withdrawn by raising party
  )),
  from_status TEXT,        -- status before this event (nullable for 'opened')
  to_status TEXT,          -- status after this event
  notes TEXT,              -- human-readable description or reviewer comment
  metadata JSONB DEFAULT '{}'::jsonb,  -- structured data (e.g. evidence IDs, arbitrator panel)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_dispute_events_dispute ON dispute_events(dispute_id);
CREATE INDEX idx_dispute_events_action ON dispute_events(action);
CREATE INDEX idx_dispute_events_created ON dispute_events(created_at);

-- RLS: users can see events for disputes they're involved in
ALTER TABLE dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their disputes"
  ON dispute_events FOR SELECT
  USING (
    dispute_id IN (
      SELECT d.id FROM disputes d
      JOIN contracts c ON d.contract_id = c.id
      WHERE c.creator_id = auth.uid() OR c.marketplace_id = auth.uid()
    )
  );

-- Admin bypass for platform reviewers (service role)
CREATE POLICY "Service role full access to dispute events"
  ON dispute_events FOR ALL
  USING (auth.role() = 'service_role');
