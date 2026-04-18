// ============================================
// Platform Secret Encryption — AES-256-GCM
// ============================================
// Two categories of secrets need encryption at rest:
//   1. Escrow fulfillments (preimages) — keys that release locked funds
//   2. Wallet seeds — XRPL private keys for platform-managed accounts (Philosophy A)
//
// Each uses a SEPARATE encryption key (defense in depth):
//   - ESCROW_ENCRYPTION_KEY → fulfillments
//   - WALLET_ENCRYPTION_KEY → wallet seeds
// If one key leaks, the other secrets remain protected.
//
// Why AES-256-GCM:
// - Authenticated encryption: tamper detection built in
// - Standard, auditable, no exotic dependencies
// - Keys never touch the database — live in env only
// - 12-byte IV per encryption = unique ciphertext even for same input

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM standard: 12 bytes
const AUTH_TAG_LENGTH = 16;  // 128-bit auth tag
const KEY_LENGTH = 32;       // 256-bit key

/**
 * Get an encryption key from environment by name.
 * Throws immediately if missing — fail loud, not silent.
 */
function getKeyFromEnv(envVar: string): Buffer {
  const keyHex = process.env[envVar];
  if (!keyHex) {
    throw new Error(
      `${envVar} is not set. ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `${envVar} must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars). ` +
      `Got ${key.length} bytes.`
    );
  }

  return key;
}

// ── Internal encrypt/decrypt (shared by all secret types) ──

function encryptString(plaintext: string, envVar: string): string {
  const key = getKeyFromEnv(envVar);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const plaintextBuffer = Buffer.from(plaintext, 'utf-8');
  const encrypted = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: IV + ciphertext + auth tag
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return packed.toString('hex');
}

function decryptString(encryptedHex: string, envVar: string, label: string): string {
  const key = getKeyFromEnv(envVar);
  const packed = Buffer.from(encryptedHex, 'hex');

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error(`Encrypted ${label} is too short — corrupted or not encrypted`);
  }

  // Unpack: IV + ciphertext + auth tag
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

// ── Escrow Fulfillment Encryption (ESCROW_ENCRYPTION_KEY) ──

/**
 * Encrypt a fulfillment string before storing in the database.
 * Output format: hex string of [IV (12 bytes) | ciphertext | auth tag (16 bytes)]
 */
export function encryptFulfillment(plaintext: string): string {
  return encryptString(plaintext, 'ESCROW_ENCRYPTION_KEY');
}

/**
 * Decrypt a fulfillment string read from the database.
 * @throws Error if tampered, wrong key, or malformed input
 */
export function decryptFulfillment(encryptedHex: string): string {
  return decryptString(encryptedHex, 'ESCROW_ENCRYPTION_KEY', 'fulfillment');
}

// ── Wallet Seed Encryption (WALLET_ENCRYPTION_KEY) ──

/**
 * Encrypt an XRPL wallet seed before storing in users.wallet_seed_encrypted.
 * Uses a SEPARATE key from escrow fulfillments — defense in depth.
 *
 * @param seed - The raw XRPL seed string (e.g. "sEdV...") from generateWallet()
 * @returns Encrypted hex string safe for DB storage
 */
export function encryptWalletSeed(seed: string): string {
  return encryptString(seed, 'WALLET_ENCRYPTION_KEY');
}

/**
 * Decrypt an XRPL wallet seed for platform signing operations.
 * Only called server-side when the platform needs to sign on behalf of a user.
 *
 * @param encryptedHex - The packed hex string from encryptWalletSeed()
 * @returns Raw XRPL seed string for Wallet.fromSeed()
 * @throws Error if tampered, wrong key, or malformed input
 */
export function decryptWalletSeed(encryptedHex: string): string {
  return decryptString(encryptedHex, 'WALLET_ENCRYPTION_KEY', 'wallet seed');
}

/**
 * Check whether a stored fulfillment looks encrypted vs plaintext.
 *
 * Plaintext fulfillments from generateCondition() start with "A0" (DER prefix).
 * Encrypted fulfillments are random bytes — statistically won't start with "A0".
 *
 * This is a heuristic for the migration script, NOT a security gate.
 * After migration, all fulfillments should be encrypted.
 */
export function isLikelyPlaintext(storedValue: string): boolean {
  if (!storedValue || storedValue.length === 0) return false;
  // DER-encoded PreimageSha256 fulfillments always start with A022
  const upper = storedValue.toUpperCase();
  return upper.startsWith('A022');
}

/**
 * Generate a new encryption key for ESCROW_ENCRYPTION_KEY env var.
 * Utility for setup — not used at runtime.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
