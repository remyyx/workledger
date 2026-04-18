-- 005: Add missing RLS policies for milestones + contract updates
-- Without these, API routes using the anon key cannot persist milestone status transitions.

-- Contracts: allow parties to update (status transitions, etc.)
DROP POLICY IF EXISTS "Contract parties can update" ON contracts;
CREATE POLICY "Contract parties can update"
  ON contracts FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = marketplace_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = marketplace_id);

-- Milestones: allow parties to read milestones for their contracts
DROP POLICY IF EXISTS "Contract parties can view milestones" ON milestones;
CREATE POLICY "Contract parties can view milestones"
  ON milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.id = milestones.contract_id
        AND (auth.uid() = c.creator_id OR auth.uid() = c.marketplace_id)
    )
  );

-- Milestones: allow parties to update milestones for their contracts
DROP POLICY IF EXISTS "Contract parties can update milestones" ON milestones;
CREATE POLICY "Contract parties can update milestones"
  ON milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.id = milestones.contract_id
        AND (auth.uid() = c.creator_id OR auth.uid() = c.marketplace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.id = milestones.contract_id
        AND (auth.uid() = c.creator_id OR auth.uid() = c.marketplace_id)
    )
  );
