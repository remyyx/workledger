-- 007: Contract Messages — activity timeline + structured communication
-- Replaces ad-hoc notification patterns with a unified message log.
-- Every contract action (fund, submit, approve, release, dispute) generates a system message.
-- Users can also send free-text messages and structured revision requests.

CREATE TABLE IF NOT EXISTS contract_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL for system messages

  -- Message classification
  type TEXT NOT NULL CHECK (type IN (
    'system',              -- Auto-generated status changes
    'message',             -- Free-text from either party
    'revision_request',    -- Structured: what's wrong + what to fix
    'deliverable_submit',  -- Creator submits work (links to milestone deliverable)
    'approval',            -- Marketplace approves milestone
    'release',             -- Funds released
    'dispute_open',        -- Dispute filed
    'deadline_warning',    -- Auto: milestone deadline approaching
    'escalation'           -- Auto: no response after X days
  )),

  -- Content
  content TEXT,                           -- Message body (markdown supported)
  attachments JSONB DEFAULT '[]'::jsonb,  -- [{name, url, hash, size, mime_type}]

  -- Structured data for specific message types
  metadata JSONB DEFAULT '{}'::jsonb,
  -- revision_request: {issues: string[], requested_changes: string, severity: 'minor'|'major'|'critical'}
  -- deliverable_submit: {media_hash, doc_hash, media_url, doc_url, notes}
  -- system: {action, old_status, new_status, tx_hash, amount, currency}
  -- deadline_warning: {milestone_seq, deadline, days_remaining}
  -- escalation: {days_waiting, escalation_level: 1|2|3, auto_action_at}

  -- Read tracking
  read_by JSONB DEFAULT '[]'::jsonb,  -- [user_id, user_id]

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract
  ON contract_messages(contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_messages_milestone
  ON contract_messages(milestone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_messages_type
  ON contract_messages(type);

-- RLS
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;

-- Both contract parties can view messages
DROP POLICY IF EXISTS "Contract parties can view messages" ON contract_messages;
CREATE POLICY "Contract parties can view messages" ON contract_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_messages.contract_id
      AND (c.creator_id = auth.uid() OR c.marketplace_id = auth.uid()
           OR (c.marketplace_id IS NULL AND c.metadata->>'marketplace_email' = (
             SELECT email FROM users WHERE id = auth.uid()
           )))
    )
  );

-- Both parties can insert messages
DROP POLICY IF EXISTS "Contract parties can send messages" ON contract_messages;
CREATE POLICY "Contract parties can send messages" ON contract_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_messages.contract_id
      AND (c.creator_id = auth.uid() OR c.marketplace_id = auth.uid())
    )
  );

-- Both parties can update (for read receipts)
DROP POLICY IF EXISTS "Contract parties can update messages" ON contract_messages;
CREATE POLICY "Contract parties can update messages" ON contract_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_messages.contract_id
      AND (c.creator_id = auth.uid() OR c.marketplace_id = auth.uid())
    )
  );

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;
