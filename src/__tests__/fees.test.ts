import { calculatePlatformFee } from '@/lib/fees';
import { PLATFORM } from '@/config/constants';

describe('calculatePlatformFee', () => {
  it('returns zero strings for invalid or non-positive amounts', () => {
    const zero = { total: '0.000000', platformFee: '0.000000', net: '0.000000' };
    expect(calculatePlatformFee('')).toEqual(zero);
    expect(calculatePlatformFee('foo')).toEqual(zero);
    expect(calculatePlatformFee(0)).toEqual(zero);
    expect(calculatePlatformFee(-10)).toEqual(zero);
  });

  it('computes platform fee and net correctly from a whole number', () => {
    // 1000 * 0.98% = 1000 * 0.0098 = 9.800000; net = 990.200000
    const { total, platformFee, net } = calculatePlatformFee(1000);
    expect(total).toBe('1000.000000');
    expect(platformFee).toBe('9.800000');
    expect(net).toBe('990.200000');
  });

  it('computes platform fee and net correctly from a string amount', () => {
    // 250.5 * 0.98% = 250.5 * 0.0098 = 2.4549; net = 248.0451
    const { total, platformFee, net } = calculatePlatformFee('250.5');
    expect(total).toBe('250.500000');
    // Verify math: fee + net === total (no rounding gap)
    const feeNum = parseFloat(platformFee);
    const netNum = parseFloat(net);
    expect((feeNum + netNum).toFixed(6)).toBe('250.500000');
    // Verify fee is within expected range for 0.98%
    expect(feeNum).toBeGreaterThan(2.45);
    expect(feeNum).toBeLessThan(2.46);
  });

  it('fee + net always sums back to total without drift', () => {
    // Test a tricky non-terminating float case
    const { total, platformFee, net } = calculatePlatformFee('33.33');
    const feeNum = parseFloat(platformFee);
    const netNum = parseFloat(net);
    expect((feeNum + netNum).toFixed(6)).toBe(parseFloat(total).toFixed(6));
  });

  it('handles 6 decimal place input amounts', () => {
    const { total, platformFee, net } = calculatePlatformFee('100.123456');
    expect(total).toBe('100.123456');
    const feeNum = parseFloat(platformFee);
    const netNum = parseFloat(net);
    expect((feeNum + netNum).toFixed(5)).toBe('100.12346');
  });

  it('platform fee rate matches PLATFORM.FEE_PERCENT constant', () => {
    const amount = 10000;
    const { platformFee } = calculatePlatformFee(amount);
    const expectedRate = PLATFORM.FEE_PERCENT / 100; // 0.00985
    const expected = (amount * expectedRate).toFixed(6);
    // Both should produce the same 6dp value
    expect(parseFloat(platformFee).toFixed(6)).toBe(expected);
  });
});
