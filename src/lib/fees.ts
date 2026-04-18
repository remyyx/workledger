import { PLATFORM } from '@/config/constants';
import { calcFeeBreakdown, type FeeBreakdown } from '@/lib/math';

// Re-export FeeBreakdown so existing imports keep working
export type { FeeBreakdown };

/**
 * Calculate fee breakdown from an amount using PLATFORM.FEE_PERCENT.
 * All arithmetic is decimal-safe (BigInt, 6 dp).
 * Returns string amounts matching XRPL IOU precision and Supabase DECIMAL(18,6).
 */
export function calculatePlatformFee(amount: string | number): FeeBreakdown {
  return calcFeeBreakdown(amount, PLATFORM.FEE_PERCENT);
}

