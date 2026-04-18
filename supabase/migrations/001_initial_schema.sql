-- ============================================
-- StudioLedger — Initial Database Schema
-- ============================================
-- Run this on Supabase to create all tables.
-- Based on the architecture in the project debrief.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================
-- USERS
-- ==================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  xrpl_address TEXT UNIQUE,
  pub_key_hash TEXT,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'marketplace', 'both')),
  verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  bio TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  payout_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- CONTRACTS
-- ==================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  marketplace_id UUID REFERENCES users(id) NOT NULL,
  template TEXT NOT NULL CHECK (template IN (
    'fixed_price', 'milestone', 'retainer',
    'pay_per_use', 'license_deal', 'subscription'
  )),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'funded', 'active', 'completed', 'disputed', 'cancelled'
  )),
  currency TEXT NOT NULL DEFAULT 'RLUSD',
  total_amount DECIMAL(18, 6) NOT NULL,
  platform_fee DECIMAL(18, 6) DEFAULT 0,
  license_terms JSONB,
  contract_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- MILESTONES
-- ==================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  sequence INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(18, 6) NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'funded', 'submitted', 'approved', 'released', 'disputed'
  )),
  escrow_tx_hash TEXT,
  escrow_sequence INTEGER,
  release_tx_hash TEXT,
  condition TEXT,
  fulfillment TEXT,
  deliverable_hash TEXT,
  pow_nft_id TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  UNIQUE(contract_id, sequence)
);

-- ==================
-- NFT REGISTRY
-- ==================
CREATE TABLE nft_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_token_id TEXT UNIQUE NOT NULL,
  taxon INTEGER NOT NULL CHECK (taxon IN (1, 2, 3)),
  issuer TEXT NOT NULL,
  owner TEXT NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  milestone_id UUID REFERENCES milestones(id),
  metadata_uri TEXT,
  metadata_cache JSONB,
  mint_tx_hash TEXT NOT NULL,
  minted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- TRANSACTION LOG
-- ==================
CREATE TABLE transaction_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash TEXT UNIQUE NOT NULL,
  tx_type TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  amount TEXT,
  currency TEXT,
  contract_id UUID REFERENCES contracts(id),
  milestone_id UUID REFERENCES milestones(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  ledger_index BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- DISPUTES
-- ==================
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) NOT NULL,
  milestone_id UUID REFERENCES milestones(id) NOT NULL,
  raised_by UUID REFERENCES users(id) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'evidence', 'review', 'resolved'
  )),
  resolution TEXT CHECK (resolution IN (
    'creator_wins', 'marketplace_wins', 'compromise'
  )),
  arbitrator_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES users(id) NOT NULL,
  description TEXT NOT NULL,
  file_hash TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- INDEXES
-- ==================
CREATE INDEX idx_contracts_creator ON contracts(creator_id);
CREATE INDEX idx_contracts_marketplace ON contracts(marketplace_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_milestones_contract ON milestones(contract_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_nft_owner ON nft_registry(owner);
CREATE INDEX idx_nft_taxon ON nft_registry(taxon);
CREATE INDEX idx_txlog_contract ON transaction_log(contract_id);
CREATE INDEX idx_users_xrpl ON users(xrpl_address);

-- ==================
-- ROW LEVEL SECURITY
-- ==================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Contracts visible to both parties
CREATE POLICY "Contract parties can view"
  ON contracts FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = marketplace_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
