/**
 * Unit tests for src/lib/xrpl/retainer-escrow.ts
 *
 * Tests cycle date calculations, retainer funding,
 * release-and-advance, and pure helper functions.
 */

const mockCreateEscrow = jest.fn();
const mockFinishEscrow = jest.fn();

jest.mock('@/lib/xrpl/escrow', () => ({
  createEscrow: mockCreateEscrow,
  finishEscrow: mockFinishEscrow,
  generateCondition: jest.fn(),
}));

const mockSubmitAndWait = jest.fn();
jest.mock('@/lib/xrpl/client', () => ({
  getXrplClient: jest.fn().mockResolvedValue({
    submitAndWait: mockSubmitAndWait,
  }),
}));

jest.mock('@/config/constants', () => ({
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
  PLATFORM: {
    FEE_PERCENT: 0.98,
    BASE_RESERVE_XRP: 1,
    OWNER_RESERVE_XRP: 0.2,
  },
}));

import {
  calculateCycleDates,
  fundRetainerCycle,
  fundInitialRetainer,
  releaseRetainerCycle,
  isCycleReleasable,
  getNextCycleStart,
  getRemainingCycles,
} from '@/lib/xrpl/retainer-escrow';
import { Wallet } from 'xrpl';

describe('Retainer Escrow Module', () => {
  const mockWallet = {
    classicAddress: 'rMarketplace123',
  } as Wallet;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // calculateCycleDates() — Pure function
  // ===========================================
  describe('calculateCycleDates()', () => {
    it('calculates cycle end as 1 month from start', () => {
      const result = calculateCycleDates('2026-03-01T00:00:00Z');

      expect(result.cycleEndDate.toISOString()).toBe('2026-04-01T00:00:00.000Z');
      expect(result.finishAfter.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    });

    it('calculates cancelAfter as cycleEnd + 14 days by default', () => {
      const result = calculateCycleDates('2026-03-01T00:00:00Z');
      const expectedCancel = new Date(result.cycleEndDate);
      expectedCancel.setDate(expectedCancel.getDate() + 14);

      expect(result.cancelAfter.getTime()).toBe(expectedCancel.getTime());
    });

    it('supports custom grace period', () => {
      const result = calculateCycleDates('2026-03-01T00:00:00Z', 7);
      const expectedCancel = new Date(result.cycleEndDate);
      expectedCancel.setDate(expectedCancel.getDate() + 7);

      expect(result.cancelAfter.getTime()).toBe(expectedCancel.getTime());
    });

    it('handles month-end boundary (Jan 31 → Feb 28)', () => {
      const result = calculateCycleDates('2026-01-31T00:00:00Z');

      // JS Date rolls Jan 31 + 1 month = Mar 3 (Feb has 28 days in 2026)
      const cycleEnd = result.cycleEndDate;
      expect(cycleEnd.getMonth()).toBe(2); // March (0-indexed)
    });

    it('finishAfter equals cycleEndDate', () => {
      const result = calculateCycleDates('2026-06-15T00:00:00Z');
      expect(result.finishAfter.getTime()).toBe(result.cycleEndDate.getTime());
    });
  });

  // ===========================================
  // isCycleReleasable() — Pure function
  // ===========================================
  describe('isCycleReleasable()', () => {
    it('returns true when approved and finishAfter has passed', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isCycleReleasable(pastDate, 'approved')).toBe(true);
    });

    it('returns false when approved but finishAfter is in future', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(isCycleReleasable(futureDate, 'approved')).toBe(false);
    });

    it('returns false when finishAfter passed but not approved', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isCycleReleasable(pastDate, 'funded')).toBe(false);
      expect(isCycleReleasable(pastDate, 'submitted')).toBe(false);
      expect(isCycleReleasable(pastDate, 'pending')).toBe(false);
    });

    it('returns false for disputed cycles', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isCycleReleasable(pastDate, 'disputed')).toBe(false);
    });
  });

  // ===========================================
  // getNextCycleStart() — Pure function
  // ===========================================
  describe('getNextCycleStart()', () => {
    it('returns 1 month after the current cycle start', () => {
      const result = getNextCycleStart('2026-03-01T00:00:00.000Z');
      expect(result).toBe('2026-04-01T00:00:00.000Z');
    });

    it('handles December to January rollover', () => {
      const result = getNextCycleStart('2026-12-01T00:00:00.000Z');
      expect(new Date(result).getFullYear()).toBe(2027);
      expect(new Date(result).getMonth()).toBe(0); // January
    });
  });

  // ===========================================
  // getRemainingCycles() — Pure function
  // ===========================================
  describe('getRemainingCycles()', () => {
    it('returns -1 for ongoing retainers (totalCycles = 0)', () => {
      expect(getRemainingCycles(0, 5)).toBe(-1);
    });

    it('returns correct remaining count', () => {
      expect(getRemainingCycles(12, 3)).toBe(9);
      expect(getRemainingCycles(6, 6)).toBe(0);
    });

    it('never returns negative for fixed retainers', () => {
      expect(getRemainingCycles(3, 5)).toBe(0);
    });
  });

  // ===========================================
  // fundRetainerCycle() — Async
  // ===========================================
  describe('fundRetainerCycle()', () => {
    beforeEach(() => {
      mockCreateEscrow.mockResolvedValue({
        txHash: 'CYCLE_TX_HASH',
        sequence: 150,
        status: 'tesSUCCESS',
      });
    });

    it('creates escrow with FinishAfter for time-gating', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 1);

      const result = await fundRetainerCycle({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        amount: '2000',
        cycleNumber: 1,
        cycleStartDate: futureStart.toISOString(),
        condition: 'COND_1',
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      const callArgs = mockCreateEscrow.mock.calls[0][0];
      expect(callArgs.finishAfterMinutes).toBeGreaterThan(0);
      expect(callArgs.cancelAfterDays).toBeGreaterThan(0);
      expect(result.cycleNumber).toBe(1);
      expect(result.txHash).toBe('CYCLE_TX_HASH');
    });

    it('returns finishAfter and cancelAfter ISO dates', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 1);

      const result = await fundRetainerCycle({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        amount: '2000',
        cycleNumber: 1,
        cycleStartDate: futureStart.toISOString(),
        condition: 'COND_1',
      });

      expect(result.finishAfter).toBeDefined();
      expect(result.cancelAfter).toBeDefined();
      // Should be valid ISO dates
      expect(new Date(result.finishAfter).getTime()).not.toBeNaN();
      expect(new Date(result.cancelAfter).getTime()).not.toBeNaN();
    });
  });

  // ===========================================
  // fundInitialRetainer() — Async
  // ===========================================
  describe('fundInitialRetainer()', () => {
    beforeEach(() => {
      mockCreateEscrow.mockResolvedValue({
        txHash: 'INITIAL_TX',
        sequence: 200,
        status: 'tesSUCCESS',
      });
    });

    it('funds 1 cycle by default', async () => {
      const results = await fundInitialRetainer({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        monthlyAmount: '2000',
        startDate: new Date().toISOString(),
        conditions: [
          { condition: 'COND_1', fulfillment: 'FUL_1' },
          { condition: 'COND_2', fulfillment: 'FUL_2' },
        ],
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });

    it('funds multiple cycles when requested', async () => {
      const results = await fundInitialRetainer({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        monthlyAmount: '2000',
        startDate: new Date().toISOString(),
        cyclesToPreFund: 2,
        conditions: [
          { condition: 'COND_1', fulfillment: 'FUL_1' },
          { condition: 'COND_2', fulfillment: 'FUL_2' },
        ],
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].cycleNumber).toBe(1);
      expect(results[1].cycleNumber).toBe(2);
    });

    it('limits funding to available conditions', async () => {
      const results = await fundInitialRetainer({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        monthlyAmount: '2000',
        startDate: new Date().toISOString(),
        cyclesToPreFund: 5,
        conditions: [
          { condition: 'COND_1', fulfillment: 'FUL_1' },
        ],
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });
  });

  // ===========================================
  // releaseRetainerCycle() — Async
  // ===========================================
  describe('releaseRetainerCycle()', () => {
    beforeEach(() => {
      mockFinishEscrow.mockResolvedValue({
        txHash: 'RELEASE_CYCLE_TX',
        status: 'tesSUCCESS',
      });
      mockSubmitAndWait.mockResolvedValue({
        result: { hash: 'FEE_TX_HASH' },
      });
      mockCreateEscrow.mockResolvedValue({
        txHash: 'NEXT_CYCLE_TX',
        sequence: 300,
        status: 'tesSUCCESS',
      });
    });

    it('releases escrow and pays platform fee', async () => {
      const result = await releaseRetainerCycle({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 50,
        condition: 'COND',
        fulfillment: 'FUL',
        cycleAmount: '2000',
        platformAddress: 'rPlatform789',
      });

      expect(mockFinishEscrow).toHaveBeenCalledTimes(1);
      expect(mockSubmitAndWait).toHaveBeenCalledTimes(1);
      expect(result.releaseTxHash).toBe('RELEASE_CYCLE_TX');
      expect(result.feeTxHash).toBe('FEE_TX_HASH');
    });

    it('funds next cycle when provided', async () => {
      const result = await releaseRetainerCycle({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 50,
        condition: 'COND',
        fulfillment: 'FUL',
        cycleAmount: '2000',
        nextCycle: {
          freelancerAddress: 'rCreator456',
          cycleNumber: 2,
          cycleStartDate: new Date().toISOString(),
          condition: 'NEXT_COND',
        },
        platformAddress: 'rPlatform789',
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      expect(result.nextCycleTxHash).toBe('NEXT_CYCLE_TX');
      expect(result.nextCycleEscrowSequence).toBe(300);
    });

    it('returns null for next cycle when not provided', async () => {
      const result = await releaseRetainerCycle({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 50,
        condition: 'COND',
        fulfillment: 'FUL',
        cycleAmount: '2000',
        platformAddress: 'rPlatform789',
      });

      expect(result.nextCycleTxHash).toBeNull();
      expect(result.nextCycleEscrowSequence).toBeNull();
    });

    it('handles fee payment failure gracefully', async () => {
      mockSubmitAndWait.mockRejectedValueOnce(new Error('Fee failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await releaseRetainerCycle({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 50,
        condition: 'COND',
        fulfillment: 'FUL',
        cycleAmount: '2000',
        platformAddress: 'rPlatform789',
      });

      expect(result.releaseTxHash).toBe('RELEASE_CYCLE_TX');
      expect(result.feeTxHash).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
