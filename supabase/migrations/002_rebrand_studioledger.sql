  -- ============================================
-- StudioLedger — Rebrand Migration (NO-OP)
-- ============================================
-- The rebrand (freelancer → creator, client → marketplace) was already
-- applied in 001_initial_schema.sql. This migration is kept for history
-- but all statements are guarded or removed to prevent errors on fresh DBs.

-- USERS: ensure role constraint exists (idempotent)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('creator', 'marketplace', 'both'));

-- CONTRACTS: columns already named creator_id / marketplace_id in 001.
-- Nothing to rename.

-- DISPUTES: ensure resolution constraint exists (idempotent)
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_resolution_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_resolution_check
  CHECK (resolution IN ('creator_wins', 'marketplace_wins', 'compromise'));

-- INDEXES: create if not exists (DROP + CREATE is safe)
DROP INDEX IF EXISTS idx_contracts_freelancer;
DROP INDEX IF EXISTS idx_contracts_client;
CREATE INDEX IF NOT EXISTS idx_contracts_creator ON contracts(creator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_marketplace ON contracts(marketplace_id);

-- RLS: re-apply policy (idempotent)
DROP POLICY IF EXISTS "Contract parties can view" ON contracts;
CREATE POLICY "Contract parties can view"
  ON contracts FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = marketplace_id);

