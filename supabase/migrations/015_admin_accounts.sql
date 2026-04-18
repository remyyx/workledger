-- ============================================
-- Migration 015: Admin Accounts & Dispute Arbitrators
-- ============================================
-- Introduces a dedicated admin system for StudioLedger staff/contractors.
-- Completely separate from the user layer (creator/marketplace).
--
-- Admin roles:
--   boss        — Full access to everything. Founder/CEO only.
--   dev         — Database, architecture, system config, error logs, XRPL monitoring.
--   accounting  — Transactions, fees, reconciliation, AUSTRAC reporting. Read-only contracts.
--   commercial  — Contract templates, briefs, dispute review, user metrics. No financials.
--   protocol    — UI/UX config, design tokens, feature flags, i18n, notifications.
--
-- Auth: @studioledger.ai email login (not Google OAuth, not self-signup).
-- Each admin gets one email: accounting@, dev@, protocol@, etc.
--
-- Also adds dispute_arbitrators: a role extension for selected users
-- who can participate in community dispute resolution (Phase 2).
-- Moderated by commercial and boss admin roles.

-- ==================
-- ADMIN ACCOUNTS
-- ==================
CREATE TABLE admin_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,                    -- must be @studioledger.ai
  display_name TEXT NOT NULL,
  admin_role TEXT NOT NULL CHECK (admin_role IN (
    'boss', 'dev', 'accounting', 'commercial', 'protocol'
  )),
  password_hash TEXT NOT NULL,                   -- bcrypt hash, set on account creation
  is_active BOOLEAN DEFAULT TRUE,               -- soft disable without deleting
  last_login_at TIMESTAMPTZ,
  created_by UUID REFERENCES admin_accounts(id), -- who created this admin (NULL for first boss)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce @studioledger.ai domain
  CONSTRAINT admin_email_domain CHECK (email LIKE '%@studioledger.ai')
);

-- Index for login lookups
CREATE INDEX idx_admin_accounts_email ON admin_accounts(email);
CREATE INDEX idx_admin_accounts_role ON admin_accounts(admin_role);

-- ==================
-- ADMIN SESSIONS
-- ==================
-- Separate session table — admin auth does NOT share cookies with user auth.
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_accounts(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,               -- SHA-256 of session token
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ==================
-- ADMIN AUDIT LOG
-- ==================
-- Every admin action is logged. Required for AUSTRAC compliance
-- and internal accountability. Immutable — no UPDATE or DELETE.
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_accounts(id) NOT NULL,
  action TEXT NOT NULL,                          -- e.g. 'dispute_resolved', 'user_suspended', 'template_updated'
  target_type TEXT,                              -- 'user', 'contract', 'dispute', 'template', 'config', etc.
  target_id UUID,                                -- ID of the affected record
  details JSONB DEFAULT '{}'::jsonb,             -- action-specific metadata
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at);

-- ==================
-- ADMIN PERMISSIONS MATRIX
-- ==================
-- Defines what each admin role can access.
-- Checked at the API layer, stored here as reference and for dynamic permission checks.
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_role TEXT NOT NULL CHECK (admin_role IN (
    'boss', 'dev', 'accounting', 'commercial', 'protocol'
  )),
  resource TEXT NOT NULL,                        -- e.g. 'disputes', 'transactions', 'templates', 'users', 'config'
  can_read BOOLEAN DEFAULT FALSE,
  can_write BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(admin_role, resource)
);

-- Seed the permission matrix
-- BOSS: everything
INSERT INTO admin_permissions (admin_role, resource, can_read, can_write, can_delete) VALUES
  ('boss', 'users',         TRUE, TRUE, TRUE),
  ('boss', 'contracts',     TRUE, TRUE, TRUE),
  ('boss', 'milestones',    TRUE, TRUE, TRUE),
  ('boss', 'disputes',      TRUE, TRUE, TRUE),
  ('boss', 'transactions',  TRUE, TRUE, FALSE),  -- no deleting tx records
  ('boss', 'templates',     TRUE, TRUE, TRUE),
  ('boss', 'briefs',        TRUE, TRUE, TRUE),
  ('boss', 'config',        TRUE, TRUE, TRUE),
  ('boss', 'admin_accounts',TRUE, TRUE, TRUE),
  ('boss', 'audit_log',     TRUE, FALSE, FALSE),  -- read-only, immutable
  ('boss', 'wallet',        TRUE, TRUE, FALSE),
  ('boss', 'austrac',       TRUE, TRUE, FALSE),
  ('boss', 'analytics',     TRUE, FALSE, FALSE),
  ('boss', 'arbitrators',   TRUE, TRUE, TRUE),
  ('boss', 'notifications', TRUE, TRUE, TRUE),
  ('boss', 'i18n',          TRUE, TRUE, TRUE),
  ('boss', 'feature_flags', TRUE, TRUE, TRUE);

-- DEV: system, database, architecture
INSERT INTO admin_permissions (admin_role, resource, can_read, can_write, can_delete) VALUES
  ('dev', 'users',          TRUE, FALSE, FALSE),  -- read for debugging, no PII export
  ('dev', 'contracts',      TRUE, FALSE, FALSE),
  ('dev', 'milestones',     TRUE, FALSE, FALSE),
  ('dev', 'config',         TRUE, TRUE,  FALSE),
  ('dev', 'audit_log',      TRUE, FALSE, FALSE),
  ('dev', 'wallet',         TRUE, FALSE, FALSE),  -- XRPL monitoring, no signing
  ('dev', 'analytics',      TRUE, FALSE, FALSE),
  ('dev', 'feature_flags',  TRUE, TRUE,  FALSE);

-- ACCOUNTING: money trail, compliance
INSERT INTO admin_permissions (admin_role, resource, can_read, can_write, can_delete) VALUES
  ('accounting', 'transactions',  TRUE, FALSE, FALSE),
  ('accounting', 'contracts',     TRUE, FALSE, FALSE),  -- read-only
  ('accounting', 'milestones',    TRUE, FALSE, FALSE),
  ('accounting', 'wallet',        TRUE, FALSE, FALSE),  -- balance checks, no signing
  ('accounting', 'austrac',       TRUE, TRUE,  FALSE),  -- file SMRs
  ('accounting', 'audit_log',     TRUE, FALSE, FALSE),
  ('accounting', 'analytics',     TRUE, FALSE, FALSE);

-- COMMERCIAL: marketplace health, disputes, templates
INSERT INTO admin_permissions (admin_role, resource, can_read, can_write, can_delete) VALUES
  ('commercial', 'users',        TRUE, FALSE, FALSE),
  ('commercial', 'contracts',    TRUE, FALSE, FALSE),
  ('commercial', 'disputes',     TRUE, TRUE,  FALSE),   -- review + resolve
  ('commercial', 'templates',    TRUE, TRUE,  TRUE),
  ('commercial', 'briefs',       TRUE, TRUE,  FALSE),   -- moderate briefs
  ('commercial', 'analytics',    TRUE, FALSE, FALSE),
  ('commercial', 'arbitrators',  TRUE, TRUE,  FALSE),   -- manage arbitrator panel
  ('commercial', 'notifications',TRUE, TRUE,  FALSE);

-- PROTOCOL: UX/UI, design, i18n
INSERT INTO admin_permissions (admin_role, resource, can_read, can_write, can_delete) VALUES
  ('protocol', 'config',         TRUE, TRUE,  FALSE),  -- UI config only
  ('protocol', 'notifications',  TRUE, TRUE,  FALSE),  -- notification templates
  ('protocol', 'i18n',           TRUE, TRUE,  TRUE),
  ('protocol', 'feature_flags',  TRUE, TRUE,  FALSE),
  ('protocol', 'templates',      TRUE, FALSE, FALSE),  -- read contract templates for UX context
  ('protocol', 'analytics',      TRUE, FALSE, FALSE);

-- ==================
-- DISPUTE ARBITRATORS (user role extension)
-- ==================
-- Selected users who can participate in community dispute resolution.
-- Must hold MCC tokens (Work Credentials) to qualify.
-- Managed by commercial and boss admins.
CREATE TABLE dispute_arbitrators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- nominated, awaiting approval
    'active',     -- approved and available for panels
    'suspended',  -- temporarily removed (conflict of interest, inactivity)
    'revoked'     -- permanently removed
  )),
  skill_domains JSONB DEFAULT '[]'::jsonb,       -- e.g. ["design", "development", "music"]
  mcc_count INTEGER DEFAULT 0,                   -- cached count of Work Credentials held
  cases_completed INTEGER DEFAULT 0,
  approved_by UUID REFERENCES admin_accounts(id), -- commercial or boss admin who approved
  approved_at TIMESTAMPTZ,
  notes TEXT,                                     -- admin notes on this arbitrator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arbitrators_user ON dispute_arbitrators(user_id);
CREATE INDEX idx_arbitrators_status ON dispute_arbitrators(status);
CREATE INDEX idx_arbitrators_domains ON dispute_arbitrators USING GIN (skill_domains);

-- ==================
-- DISPUTE PANELS (Phase 2 — community arbitration)
-- ==================
-- When a dispute escalates to community arbitration,
-- a panel of 3 arbitrators is assembled.
CREATE TABLE dispute_panels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  arbitrator_id UUID REFERENCES dispute_arbitrators(id) NOT NULL,
  vote TEXT CHECK (vote IN ('creator', 'marketplace', 'split', NULL)),
  vote_reason TEXT,
  voted_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, arbitrator_id)              -- one vote per arbitrator per dispute
);

CREATE INDEX idx_panels_dispute ON dispute_panels(dispute_id);
CREATE INDEX idx_panels_arbitrator ON dispute_panels(arbitrator_id);

-- ==================
-- RLS POLICIES
-- ==================
-- Admin tables: NO public access. Service role only.
-- Admin API routes use the service role key, not the anon key.

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_arbitrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_panels ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all admin tables
CREATE POLICY "Service role full access" ON admin_accounts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON admin_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON admin_audit_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON admin_permissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON dispute_arbitrators FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON dispute_panels FOR ALL USING (auth.role() = 'service_role');

-- Users can see their own arbitrator status
CREATE POLICY "Users can view own arbitrator record"
  ON dispute_arbitrators FOR SELECT
  USING (user_id = auth.uid());

-- Arbitrators can see panels they're assigned to
CREATE POLICY "Arbitrators can view own panel assignments"
  ON dispute_panels FOR SELECT
  USING (
    arbitrator_id IN (
      SELECT id FROM dispute_arbitrators WHERE user_id = auth.uid()
    )
  );

-- Dispute parties can see panel composition (transparency)
CREATE POLICY "Dispute parties can view panel"
  ON dispute_panels FOR SELECT
  USING (
    dispute_id IN (
      SELECT d.id FROM disputes d
      JOIN contracts c ON d.contract_id = c.id
      WHERE c.creator_id = auth.uid() OR c.marketplace_id = auth.uid()
    )
  );

-- ==================
-- DROP old is_admin column (superseded by admin_accounts)
-- ==================
-- Migration 013 added a simple is_admin boolean.
-- The new admin_accounts table replaces it entirely.
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
DROP INDEX IF EXISTS idx_users_admin;
