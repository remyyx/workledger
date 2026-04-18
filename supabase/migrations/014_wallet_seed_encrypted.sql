-- Migration 014: Add encrypted wallet seed storage
-- Philosophy A (platform-managed wallets) requires storing user wallet seeds.
-- Seeds are encrypted with AES-256-GCM at the application layer before storage.
-- The encryption key (WALLET_ENCRYPTION_KEY) lives in env only — never in the database.

ALTER TABLE users ADD COLUMN wallet_seed_encrypted TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN users.wallet_seed_encrypted IS
  'AES-256-GCM encrypted XRPL wallet seed. Encrypted at app layer before insert. Key in WALLET_ENCRYPTION_KEY env var. NULL for users who connected their own wallet (Philosophy B / Xaman auth).';

-- RLS: wallet_seed_encrypted should NEVER be readable by the user themselves.
-- It is only accessed server-side by service role for platform signing operations.
-- The existing RLS policies on users only expose safe columns via select.
-- Double-check: ensure no existing policy exposes wallet_seed_encrypted to anon or authenticated roles.
