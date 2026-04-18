-- ============================================
-- Migration 013: Admin Role (Dispute Resolution)
-- ============================================
-- Adds admin capability to users table.
-- Admins can review and resolve disputes in Phase 1.

ALTER TABLE users
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Index for efficient admin queries
CREATE INDEX idx_users_admin ON users(is_admin);
