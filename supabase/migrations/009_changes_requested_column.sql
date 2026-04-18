-- 007: Track "changes requested" state for milestone rework UX
-- Used to show a "Changes requested" line under the FUNDED radian badge.

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ;

