DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() = marketplace_id
    OR (
      marketplace_id IS NULL
      AND metadata->>'marketplace_email' = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Creators can insert contracts" ON contracts;
CREATE POLICY "Creators can insert contracts" ON contracts
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Contract parties can update" ON contracts;
CREATE POLICY "Contract parties can update" ON contracts
  FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR auth.uid() = marketplace_id
    OR (
      marketplace_id IS NULL
      AND metadata->>'marketplace_email' = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Contract creators can insert milestones" ON milestones;
CREATE POLICY "Contract creators can insert milestones" ON milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = milestones.contract_id
      AND contracts.creator_id = auth.uid()
    )
  );