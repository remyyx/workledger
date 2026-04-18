/**
 * Unit tests for src/lib/xrpl/milestone-escrow.ts
 *
 * Tests the milestone buffer system, funding orchestration,
 * release-and-advance flow, and pure helper functions.
 */

// Mock XRPL escrow functions
const mockCreateEscrow = jest.fn();
const mockFinishEscrow = jest.fn();
const mockGenerateCondition = jest.fn();

jest.mock('@/lib/xrpl/escrow', () => ({
  createEscrow: mockCreateEscrow,
  finishEscrow: mockFinishEscrow,
  generateCondition: mockGenerateCondition,
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

jest.mock('@/lib/crypto', () => ({
  decryptWalletSeed: jest.fn(() => 'sEdFAKESEED123456789'),
}));

// Mock Wallet.fromSeed so we don't need real XRPL key derivation
jest.mock('xrpl', () => ({
  Wallet: {
    fromSeed: jest.fn(() => ({ classicAddress: 'rCreatorDecrypted456' })),
  },
}));

import {
  fundInitialMilestones,
  releaseMilestoneAndAdvance,
  getMilestonesToFund,
  isContractComplete,
  getActiveMilestone,
} from '@/lib/xrpl/milestone-escrow';
import { Wallet } from 'xrpl';

describe('Milestone Escrow Module', () => {
  const mockWallet = {
    classicAddress: 'rMarketplace123',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // getMilestonesToFund() — Pure function
  // ===========================================
  describe('getMilestonesToFund()', () => {
    it('returns first 2 pending milestones when none are funded', () => {
      const milestones = [
        { sequence: 1, status: 'pending' },
        { sequence: 2, status: 'pending' },
        { sequence: 3, status: 'pending' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([1, 2]);
    });

    it('returns 1 pending milestone when 1 is already funded', () => {
      const milestones = [
        { sequence: 1, status: 'funded' },
        { sequence: 2, status: 'pending' },
        { sequence: 3, status: 'pending' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([2]);
    });

    it('returns empty when buffer is full', () => {
      const milestones = [
        { sequence: 1, status: 'funded' },
        { sequence: 2, status: 'submitted' },
        { sequence: 3, status: 'pending' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([]);
    });

    it('counts submitted and approved as "funded" for buffer', () => {
      const milestones = [
        { sequence: 1, status: 'submitted' },
        { sequence: 2, status: 'approved' },
        { sequence: 3, status: 'pending' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([]);
    });

    it('returns empty when no pending milestones exist', () => {
      const milestones = [
        { sequence: 1, status: 'released' },
        { sequence: 2, status: 'released' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([]);
    });

    it('sorts by sequence before selecting', () => {
      const milestones = [
        { sequence: 5, status: 'pending' },
        { sequence: 3, status: 'pending' },
        { sequence: 4, status: 'pending' },
      ];

      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([3, 4]); // Lowest sequences first
    });

    it('handles single milestone contract', () => {
      const milestones = [{ sequence: 1, status: 'pending' }];
      const result = getMilestonesToFund(milestones);
      expect(result).toEqual([1]);
    });
  });

  // ===========================================
  // isContractComplete() — Pure function
  // ===========================================
  describe('isContractComplete()', () => {
    it('returns true when all milestones are released', () => {
      const milestones = [
        { status: 'released' },
        { status: 'released' },
        { status: 'released' },
      ];
      expect(isContractComplete(milestones)).toBe(true);
    });

    it('returns false when any milestone is not released', () => {
      const milestones = [
        { status: 'released' },
        { status: 'approved' },
        { status: 'pending' },
      ];
      expect(isContractComplete(milestones)).toBe(false);
    });

    it('returns false for empty milestones array', () => {
      expect(isContractComplete([])).toBe(false);
    });

    it('returns false when one milestone is disputed', () => {
      const milestones = [
        { status: 'released' },
        { status: 'disputed' },
      ];
      expect(isContractComplete(milestones)).toBe(false);
    });
  });

  // ===========================================
  // getActiveMilestone() — Pure function
  // ===========================================
  describe('getActiveMilestone()', () => {
    it('returns first funded milestone', () => {
      const milestones = [
        { sequence: 1, status: 'released' },
        { sequence: 2, status: 'funded' },
        { sequence: 3, status: 'pending' },
      ];
      expect(getActiveMilestone(milestones)).toBe(2);
    });

    it('returns first submitted milestone', () => {
      const milestones = [
        { sequence: 1, status: 'released' },
        { sequence: 2, status: 'submitted' },
        { sequence: 3, status: 'funded' },
      ];
      expect(getActiveMilestone(milestones)).toBe(2);
    });

    it('prefers lowest sequence among funded/submitted', () => {
      const milestones = [
        { sequence: 3, status: 'funded' },
        { sequence: 1, status: 'submitted' },
        { sequence: 2, status: 'funded' },
      ];
      expect(getActiveMilestone(milestones)).toBe(1);
    });

    it('returns null when no active milestones', () => {
      const milestones = [
        { sequence: 1, status: 'released' },
        { sequence: 2, status: 'pending' },
      ];
      expect(getActiveMilestone(milestones)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(getActiveMilestone([])).toBeNull();
    });
  });

  // ===========================================
  // fundInitialMilestones() — Async
  // ===========================================
  describe('fundInitialMilestones()', () => {
    beforeEach(() => {
      mockCreateEscrow.mockResolvedValue({
        txHash: 'ESCROW_TX_HASH',
        sequence: 100,
        status: 'tesSUCCESS',
      });
    });

    it('funds first 2 milestones (BUFFER_SIZE)', async () => {
      const milestones = [
        { sequence: 1, amount: '500', condition: 'COND_1' },
        { sequence: 2, amount: '300', condition: 'COND_2' },
        { sequence: 3, amount: '200', condition: 'COND_3' },
      ];

      const results = await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
      });

      // Only 2 escrows should be created (buffer size = 2)
      expect(mockCreateEscrow).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].milestoneSequence).toBe(1);
      expect(results[1].milestoneSequence).toBe(2);
    });

    it('funds all milestones when fewer than buffer size', async () => {
      const milestones = [
        { sequence: 1, amount: '1000', condition: 'COND_1' },
      ];

      const results = await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });

    it('passes correct parameters to createEscrow', async () => {
      const milestones = [
        { sequence: 1, amount: '500', condition: 'COND_1' },
      ];

      await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
        currency: 'USD',
        issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
      });

      expect(mockCreateEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          clientWallet: mockWallet,
          freelancerAddress: 'rCreator456',
          amount: '500',
          currency: 'USD',
          issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
          condition: 'COND_1',
        }),
      );
    });

    it('calculates cancelAfterDays from milestone deadline', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20); // 20 days from now

      const milestones = [
        { sequence: 1, amount: '500', condition: 'COND_1', deadline: futureDate.toISOString() },
      ];

      await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
      });

      const callArgs = mockCreateEscrow.mock.calls[0][0];
      // Should be deadline days + 7 day grace
      expect(callArgs.cancelAfterDays).toBeGreaterThanOrEqual(27);
    });

    it('defaults cancelAfterDays to 30 when no deadline', async () => {
      const milestones = [
        { sequence: 1, amount: '500', condition: 'COND_1' },
      ];

      await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
      });

      const callArgs = mockCreateEscrow.mock.calls[0][0];
      expect(callArgs.cancelAfterDays).toBe(30);
    });

    it('returns results with correct structure', async () => {
      const milestones = [
        { sequence: 1, amount: '500', condition: 'COND_1' },
      ];

      const results = await fundInitialMilestones({
        marketplaceWallet: mockWallet,
        creatorAddress: 'rCreator456',
        milestones,
      });

      expect(results[0]).toEqual({
        milestoneSequence: 1,
        txHash: 'ESCROW_TX_HASH',
        escrowSequence: 100,
        condition: 'COND_1',
        fulfillment: '', // Stored separately
      });
    });
  });

  // ===========================================
  // releaseMilestoneAndAdvance() — Async
  // ===========================================
  describe('releaseMilestoneAndAdvance()', () => {
    beforeEach(() => {
      mockFinishEscrow.mockResolvedValue({
        txHash: 'RELEASE_TX_HASH',
        status: 'tesSUCCESS',
      });
      mockSubmitAndWait.mockResolvedValue({
        result: { hash: 'FEE_TX_HASH' },
      });
      mockCreateEscrow.mockResolvedValue({
        txHash: 'NEXT_ESCROW_TX_HASH',
        sequence: 200,
        status: 'tesSUCCESS',
      });
    });

    it('releases escrow and pays platform fee', async () => {
      const result = await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '1000',
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      // Escrow should be finished
      expect(mockFinishEscrow).toHaveBeenCalledWith({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
      });

      // Fee payment should be made
      expect(mockSubmitAndWait).toHaveBeenCalledTimes(1);
      const [feeTx] = mockSubmitAndWait.mock.calls[0];
      expect(feeTx.TransactionType).toBe('Payment');
      expect(feeTx.Destination).toBe('rPlatform789');

      expect(result.releaseTxHash).toBe('RELEASE_TX_HASH');
      expect(result.feeTxHash).toBe('FEE_TX_HASH');
    });

    it('calculates correct 0.98% platform fee', async () => {
      await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '1000',
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      const [feeTx] = mockSubmitAndWait.mock.calls[0];
      const expectedFee = (1000 * (0.98 / 100)).toFixed(6);
      expect(feeTx.Amount.value).toBe(expectedFee);
    });

    it('funds next milestone when provided', async () => {
      const result = await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '500',
        nextMilestone: {
          freelancerAddress: 'rCreator456',
          amount: '300',
          condition: 'NEXT_COND',
        },
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      expect(mockCreateEscrow).toHaveBeenCalledTimes(1);
      expect(result.nextEscrowTxHash).toBe('NEXT_ESCROW_TX_HASH');
      expect(result.nextEscrowSequence).toBe(200);
    });

    it('returns null for next escrow when no next milestone', async () => {
      const result = await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '500',
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      expect(mockCreateEscrow).not.toHaveBeenCalled();
      expect(result.nextEscrowTxHash).toBeNull();
      expect(result.nextEscrowSequence).toBeNull();
    });

    it('handles fee payment failure gracefully', async () => {
      mockSubmitAndWait.mockRejectedValueOnce(new Error('Insufficient funds'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '500',
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      // Release should still succeed
      expect(result.releaseTxHash).toBe('RELEASE_TX_HASH');
      expect(result.feeTxHash).toBeNull();

      consoleSpy.mockRestore();
    });

    it('handles next escrow creation failure gracefully', async () => {
      mockCreateEscrow.mockRejectedValueOnce(new Error('Failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await releaseMilestoneAndAdvance({
        signerWallet: mockWallet,
        escrowOwner: 'rOwner123',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
        milestoneAmount: '500',
        nextMilestone: {
          freelancerAddress: 'rCreator456',
          amount: '300',
          condition: 'NEXT_COND',
        },
        platformAddress: 'rPlatform789',
        creatorEncryptedSeed: 'ENCRYPTED_SEED_HEX',
      });

      expect(result.releaseTxHash).toBe('RELEASE_TX_HASH');
      expect(result.nextEscrowTxHash).toBeNull();
      expect(result.nextEscrowSequence).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
