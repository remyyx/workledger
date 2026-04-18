-- 006: Allow contract creator to INSERT milestones (create contract flow)
-- Without this, "Create Contract & Send to Client" succeeds on contracts but milestone insert is blocked by RLS.

DROP POLICY IF EXISTS "Contract creator can insert milestones" ON milestones;
CREATE POLICY "Contract creator can insert milestones"
  ON milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.id = milestones.contract_id
        AND c.creator_id = auth.uid()
    )
  );
