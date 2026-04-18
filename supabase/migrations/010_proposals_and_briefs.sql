-- ============================================
-- StudioLedger — Project Briefs & Proposals
-- ============================================
-- Bi-directional negotiation system:
--   Path A: MK posts brief → CR sends proposal → counter-offers → accept → contract
--   Path B: MK sends direct offer to CR → counter-offers → accept → contract

-- ==================
-- PROJECT BRIEFS
-- ==================
-- Marketplace users post briefs; creators browse and propose.
CREATE TABLE project_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  skills_required JSONB DEFAULT '[]'::jsonb,
  budget_min DECIMAL(18, 6),
  budget_max DECIMAL(18, 6),
  currency TEXT NOT NULL DEFAULT 'RLUSD',
  deadline TIMESTAMPTZ,
  template TEXT NOT NULL DEFAULT 'milestone' CHECK (template IN (
    'fixed_price', 'milestone', 'retainer',
    'pay_per_use', 'license_deal', 'subscription'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_negotiation', 'filled', 'cancelled'
  )),
  proposals_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- PROPOSALS
-- ==================
-- One proposal per CR–MK pair per brief (or per direct offer).
-- Contains multiple rounds of negotiation.
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID REFERENCES project_briefs(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES users(id) NOT NULL,
  marketplace_id UUID REFERENCES users(id) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('cr_to_mk', 'mk_to_cr')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'countered', 'accepted', 'withdrawn', 'declined'
  )),
  current_round INTEGER NOT NULL DEFAULT 1,
  contract_id UUID REFERENCES contracts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- PROPOSAL ROUNDS
-- ==================
-- Each round = one set of terms (initial offer or counter-offer).
-- Unlimited rounds until accept/decline/withdraw.
CREATE TABLE proposal_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  author_id UUID REFERENCES users(id) NOT NULL,
  terms JSONB NOT NULL,              -- ProposalTerms JSON
  message TEXT,                      -- cover letter or counter-offer note
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, round_number)
);

-- ==================
-- INDEXES
-- ==================
CREATE INDEX idx_briefs_author ON project_briefs(author_id);
CREATE INDEX idx_briefs_status ON project_briefs(status);
CREATE INDEX idx_briefs_category ON project_briefs(category);
CREATE INDEX idx_proposals_brief ON proposals(brief_id);
CREATE INDEX idx_proposals_creator ON proposals(creator_id);
CREATE INDEX idx_proposals_marketplace ON proposals(marketplace_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposal_rounds_proposal ON proposal_rounds(proposal_id);

-- ==================
-- ROW LEVEL SECURITY
-- ==================
ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_rounds ENABLE ROW LEVEL SECURITY;

-- Briefs: open briefs visible to everyone; own briefs always visible
CREATE POLICY "Open briefs visible to all"
  ON project_briefs FOR SELECT
  USING (status = 'open' OR author_id = auth.uid());

-- Brief authors can insert and update their own briefs
CREATE POLICY "Authors can create briefs"
  ON project_briefs FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own briefs"
  ON project_briefs FOR UPDATE
  USING (author_id = auth.uid());

-- Proposals: visible to both parties
CREATE POLICY "Proposal parties can view"
  ON proposals FOR SELECT
  USING (creator_id = auth.uid() OR marketplace_id = auth.uid());

CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  WITH CHECK (creator_id = auth.uid() OR marketplace_id = auth.uid());

CREATE POLICY "Proposal parties can update"
  ON proposals FOR UPDATE
  USING (creator_id = auth.uid() OR marketplace_id = auth.uid());

-- Rounds: visible to proposal parties (via join)
CREATE POLICY "Round parties can view"
  ON proposal_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_rounds.proposal_id
      AND (p.creator_id = auth.uid() OR p.marketplace_id = auth.uid())
    )
  );

CREATE POLICY "Round parties can insert"
  ON proposal_rounds FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ==================
-- TRIGGERS
-- ==================
CREATE TRIGGER briefs_updated_at
  BEFORE UPDATE ON project_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment proposals_count on brief when proposal created
CREATE OR REPLACE FUNCTION increment_brief_proposals_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brief_id IS NOT NULL THEN
    UPDATE project_briefs
    SET proposals_count = proposals_count + 1
    WHERE id = NEW.brief_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposal_count_increment
  AFTER INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION increment_brief_proposals_count();
