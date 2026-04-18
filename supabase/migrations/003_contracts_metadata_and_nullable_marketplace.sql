-- 003: Add metadata column to contracts + make marketplace_id nullable
-- Allows draft contracts where the buyer hasn't registered yet

-- Add metadata JSONB for flexible storage (retainer config, pending invites, etc.)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Make marketplace_id nullable so contracts can be created before buyer registers
ALTER TABLE contracts ALTER COLUMN marketplace_id DROP NOT NULL;

-- Update RLS policy to handle null marketplace_id
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
CREATE POLICY "Users can view own contracts" ON contracts
  FOR ALL
  USING (auth.uid() = creator_id OR auth.uid() = marketplace_id);
