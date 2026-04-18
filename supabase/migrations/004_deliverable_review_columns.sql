-- Optional deliverable metadata for approval-phase review (notes + optional preview links).
-- File storage (R2/IPFS) is Phase 2; creators can paste external links for client preview.
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS deliverable_notes TEXT,
  ADD COLUMN IF NOT EXISTS deliverable_media_url TEXT,
  ADD COLUMN IF NOT EXISTS deliverable_doc_url TEXT;
