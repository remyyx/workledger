/**
 * Decimal-safe math utilities for StudioLedger financial values.
 *
 * Why this exists:
 *   parseFloat / toFixed drifts on non-terminating binary fractions.
 *   e.g. (33.33 * 0.00985) in JS float = 0.32813450000000002
 *   All fee, escrow, and payment amounts MUST be exact to 6 decimal places
 *   to match XRPL IOU precision and Supabase DECIMAL(18,6).
 *
 * Strategy:
 *   Scale all values to 8 decimal places using BigInt integer arithmetic,
 *   then round back to 6 dp for storage / XRPL submission.
 *   No external dependencies required.
 */

/** Internal scale: 10^8 — gives 8 dp precision for intermediate products */
const SCALE = 100_000_000n;

/**
 * Convert a string or number amount to scaled BigInt (8 dp).
 * Handles negative values and truncates beyond 8 dp.
 */
function toScaled(value: string | number): bigint {
  const str =
    typeof value === 'number'
      ? value.toFixed(8) // avoid scientific notation for tiny numbers
      : String(value || '0').trim();

  if (!str || str === '0' || str === '') return 0n;

  const isNeg = str.startsWith('-');
  const abs = isNeg ? str.slice(1) : str;
  const [intPart = '0', fracPart = ''] = abs.split('.');

  // Pad or truncate fractional part to exactly 8 digits
  const fracNorm = fracPart.slice(0, 8).padEnd(8, '0');

  const scaled = BigInt(intPart) * SCALE + BigInt(fracNorm);
  return isNeg ? -scaled : scaled;
}

/**
 * Convert scaled BigInt back to a fixed-decimal string.
 * @param scaled  Internal BigInt value (8 dp scale)
 * @param dp      Output decimal places (default 6, matching XRPL IOU / Supabase)
 */
function fromScaled(scaled: bigint, dp = 6): string {
  const isNeg = scaled < 0n;
  const abs = isNeg ? -scaled : scaled;

  const intPart = abs / SCALE;
  const fracFull = (abs % SCALE).toString().padStart(8, '0'); // always 8 chars
  const fracTrunc = fracFull.slice(0, dp);

  return `${isNeg ? '-' : ''}${intPart}.${fracTrunc}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse any amount to a normalised 6-dp string.
 * Returns '0.000000' for falsy / invalid input.
 */
export function parseAmount(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0.000000';
  try {
    return fromScaled(toScaled(value), 6);
  } catch {
    return '0.000000';
  }
}

/** Add two amounts. Returns 6-dp string. */
export function addAmount(a: string | number, b: string | number): string {
  return fromScaled(toScaled(a) + toScaled(b), 6);
}

/** Subtract b from a. Returns 6-dp string. */
export function subAmount(a: string | number, b: string | number): string {
  return fromScaled(toScaled(a) - toScaled(b), 6);
}

/**
 * Multiply two amounts.
 * Internally: (a × 10^8) × (b × 10^8) / 10^8 = a×b × 10^8
 * Returns 6-dp string.
 */
export function mulAmount(a: string | number, b: string | number): string {
  const result = (toScaled(a) * toScaled(b)) / SCALE;
  return fromScaled(result, 6);
}

/** Returns true if value is strictly greater than zero. */
export function gtZero(value: string | number | undefined | null): boolean {
  try {
    return toScaled(value ?? 0) > 0n;
  } catch {
    return false;
  }
}

/** Compare two amounts. Returns negative / zero / positive like localeCompare. */
export function cmpAmount(a: string | number, b: string | number): number {
  const diff = toScaled(a) - toScaled(b);
  if (diff > 0n) return 1;
  if (diff < 0n) return -1;
  return 0;
}

/**
 * Format an amount for display (not for on-chain submission).
 * Strips trailing zeros after the required minimum decimal places.
 * e.g. formatDisplay('0.98100', 2) → '0.99'
 */
export function formatDisplay(value: string | number, minDp = 2): string {
  const raw = parseAmount(value);
  const [int, frac] = raw.split('.');
  // Keep at least minDp, trim trailing zeros beyond that
  const trimmed = frac.slice(0, Math.max(minDp, frac.replace(/0+$/, '').length));
  return `${int}.${trimmed}`;
}

// ─── Fee helpers ─────────────────────────────────────────────────────────────

export interface FeeBreakdown {
  /** Normalised total as 6-dp string */
  total: string;
  /** Platform fee portion as 6-dp string */
  platformFee: string;
  /** Creator net amount as 6-dp string */
  net: string;
}

/**
 * Calculate platform fee breakdown using safe integer arithmetic.
 * @param amount    Contract / milestone amount (string or number)
 * @param feePercent  Fee as a percentage, e.g. 0.98 for 0.98%
 */
export function calcFeeBreakdown(
  amount: string | number,
  feePercent: number,
): FeeBreakdown {
  const total = parseAmount(amount);

  if (!gtZero(total)) {
    return { total: '0.000000', platformFee: '0.000000', net: '0.000000' };
  }

  // feeRate = feePercent / 100  (e.g. 0.98 / 100 = 0.00985)
  // Use string to avoid float imprecision in the rate itself
  const feeRate = (feePercent / 100).toFixed(8); // 8 dp → exact for our rate

  const platformFee = mulAmount(total, feeRate);
  const net = subAmount(total, platformFee);

  return { total, platformFee, net };
}
