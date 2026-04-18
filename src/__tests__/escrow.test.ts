/**
 * Unit tests for src/lib/xrpl/escrow.ts
 *
 * Tests the crypto-condition generation and escrow CRUD operations.
 * XRPL client calls are mocked — we're testing our logic, not the ledger.
 */

import * as crypto from 'crypto';

// Mock the XRPL client before importing escrow module
const mockSubmitAndWait = jest.fn();
jest.mock('@/lib/xrpl/client', () => ({
  getXrplClient: jest.fn().mockResolvedValue({
    submitAndWait: mockSubmitAndWait,
  }),
}));

jest.mock('@/config/constants', () => ({
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
}));

import { generateCondition, createEscrow, finishEscrow, cancelEscrow } from '@/lib/xrpl/escrow';
import { Wallet } from 'xrpl';

describe('Escrow Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // generateCondition()
  // ===========================================
  describe('generateCondition()', () => {
    it('returns condition, fulfillment, and preimage as hex strings', () => {
      const result = generateCondition();

      expect(result).toHaveProperty('condition');
      expect(result).toHaveProperty('fulfillment');
      expect(result).toHaveProperty('preimage');

      // All should be uppercase hex
      expect(result.condition).toMatch(/^[0-9A-F]+$/);
      expect(result.fulfillment).toMatch(/^[0-9A-F]+$/);
      expect(result.preimage).toMatch(/^[0-9a-f]+$/); // preimage is lowercase hex
    });

    it('generates unique conditions on each call', () => {
      const result1 = generateCondition();
      const result2 = generateCondition();

      expect(result1.condition).not.toBe(result2.condition);
      expect(result1.fulfillment).not.toBe(result2.fulfillment);
      expect(result1.preimage).not.toBe(result2.preimage);
    });

    it('fulfillment contains the preimage bytes', () => {
      const result = generateCondition();
      const fulfillmentHex = result.fulfillment;
      const preimageHex = result.preimage;

      // The fulfillment is ASN.1 DER: [A0 22 80 20] + 32-byte preimage
      // So the last 64 hex chars should be the preimage
      expect(fulfillmentHex.slice(8)).toBe(preimageHex.toUpperCase());
    });

    it('condition contains SHA-256 of preimage', () => {
      const result = generateCondition();
      const preimage = Buffer.from(result.preimage, 'hex');
      const expectedHash = crypto.createHash('sha256').update(preimage).digest('hex').toUpperCase();

      // Condition is ASN.1 DER: [A0 25 80 20] + 32-byte hash + [81 01 20]
      const conditionHash = result.condition.slice(8, 8 + 64);
      expect(conditionHash).toBe(expectedHash);
    });

    it('condition has correct ASN.1 DER structure', () => {
      const result = generateCondition();
      const condBuf = Buffer.from(result.condition, 'hex');

      // Tag: constructed [0] (0xA0)
      expect(condBuf[0]).toBe(0xa0);
      // Length: 37 bytes (0x25)
      expect(condBuf[1]).toBe(0x25);
      // Inner tag: primitive [0] (0x80)
      expect(condBuf[2]).toBe(0x80);
      // Inner length: 32 bytes (0x20) — SHA-256 hash size
      expect(condBuf[3]).toBe(0x20);
      // Cost tag (0x81), length 1 (0x01), value 32 (0x20)
      expect(condBuf[36]).toBe(0x81);
      expect(condBuf[37]).toBe(0x01);
      expect(condBuf[38]).toBe(0x20);

      // Total length: 39 bytes (4 header + 32 hash + 3 cost)
      expect(condBuf.length).toBe(39);
    });

    it('fulfillment has correct ASN.1 DER structure', () => {
      const result = generateCondition();
      const fulBuf = Buffer.from(result.fulfillment, 'hex');

      // Tag: constructed [0] (0xA0)
      expect(fulBuf[0]).toBe(0xa0);
      // Length: 34 bytes (0x22)
      expect(fulBuf[1]).toBe(0x22);
      // Inner tag: primitive [0] (0x80)
      expect(fulBuf[2]).toBe(0x80);
      // Inner length: 32 bytes (0x20) — preimage size
      expect(fulBuf[3]).toBe(0x20);

      // Total length: 36 bytes (4 header + 32 preimage)
      expect(fulBuf.length).toBe(36);
    });

    it('condition and fulfillment are cryptographically linked', () => {
      const result = generateCondition();
      const preimage = Buffer.from(result.preimage, 'hex');

      // Manually compute what condition SHOULD be
      const hash = crypto.createHash('sha256').update(preimage).digest();
      const expectedCondition = Buffer.concat([
        Buffer.from([0xa0, 0x25, 0x80, 0x20]),
        hash,
        Buffer.from([0x81, 0x01, 0x20]),
      ]).toString('hex').toUpperCase();

      expect(result.condition).toBe(expectedCondition);
    });
  });

  // ===========================================
  // createEscrow()
  // ===========================================
  describe('createEscrow()', () => {
    const mockWallet = {
      classicAddress: 'rMarketplaceAddr123',
    } as Wallet;

    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'ABCDEF1234567890',
          tx_json: { Sequence: 42 },
          meta: 'tesSUCCESS',
        },
      });
    });

    it('submits EscrowCreate with correct transaction fields', async () => {
      const { condition } = generateCondition();

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
      });

      expect(mockSubmitAndWait).toHaveBeenCalledTimes(1);
      const [tx, opts] = mockSubmitAndWait.mock.calls[0];

      expect(tx.TransactionType).toBe('EscrowCreate');
      expect(tx.Account).toBe('rMarketplaceAddr123');
      expect(tx.Destination).toBe('rCreatorAddr456');
      expect(tx.Amount).toEqual({
        currency: 'RLUSD',
        issuer: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
        value: '500',
      });
      expect(tx.Condition).toBe(condition);
      expect(tx.CancelAfter).toBeDefined();
      expect(opts.wallet).toBe(mockWallet);
    });

    it('uses default RLUSD currency and issuer', async () => {
      const { condition } = generateCondition();

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '100',
        condition,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Amount.currency).toBe('RLUSD');
      expect(tx.Amount.issuer).toBe('rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3');
    });

    it('supports custom currency and issuer', async () => {
      const { condition } = generateCondition();

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '1000',
        currency: 'USD',
        issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
        condition,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Amount.currency).toBe('USD');
      expect(tx.Amount.issuer).toBe('rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq');
    });

    it('calculates CancelAfter using Ripple Epoch offset', async () => {
      const { condition } = generateCondition();
      const beforeTime = Math.floor(Date.now() / 1000) - 946684800;

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
        cancelAfterDays: 30,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      const afterTime = Math.floor(Date.now() / 1000) - 946684800;

      // CancelAfter should be ~30 days from now in Ripple epoch
      const thirtyDaysSec = 30 * 24 * 60 * 60;
      expect(tx.CancelAfter).toBeGreaterThanOrEqual(beforeTime + thirtyDaysSec);
      expect(tx.CancelAfter).toBeLessThanOrEqual(afterTime + thirtyDaysSec);
    });

    it('omits FinishAfter when finishAfterMinutes is 0', async () => {
      const { condition } = generateCondition();

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
        finishAfterMinutes: 0,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.FinishAfter).toBeUndefined();
    });

    it('sets FinishAfter when finishAfterMinutes > 0', async () => {
      const { condition } = generateCondition();

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
        finishAfterMinutes: 60,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.FinishAfter).toBeDefined();
      // FinishAfter should be approximately 60 min from now
      const nowRipple = Math.floor(Date.now() / 1000) - 946684800;
      expect(tx.FinishAfter).toBeGreaterThanOrEqual(nowRipple + 3500);
      expect(tx.FinishAfter).toBeLessThanOrEqual(nowRipple + 3700);
    });

    it('returns txHash and sequence from result', async () => {
      const { condition } = generateCondition();

      const result = await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
      });

      expect(result.txHash).toBe('ABCDEF1234567890');
      expect(result.sequence).toBe(42);
      expect(result.status).toBe('tesSUCCESS');
    });

    it('defaults cancelAfterDays to 30', async () => {
      const { condition } = generateCondition();
      const beforeTime = Math.floor(Date.now() / 1000) - 946684800;

      await createEscrow({
        clientWallet: mockWallet,
        freelancerAddress: 'rCreatorAddr456',
        amount: '500',
        condition,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      const thirtyDaysSec = 30 * 24 * 60 * 60;
      expect(tx.CancelAfter).toBeGreaterThanOrEqual(beforeTime + thirtyDaysSec - 5);
    });
  });

  // ===========================================
  // finishEscrow()
  // ===========================================
  describe('finishEscrow()', () => {
    const mockWallet = {
      classicAddress: 'rSignerAddr789',
    } as Wallet;

    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'FINISH_TX_HASH_123',
          meta: 'tesSUCCESS',
        },
      });
    });

    it('submits EscrowFinish with correct fields', async () => {
      await finishEscrow({
        signerWallet: mockWallet,
        escrowOwner: 'rOwnerAddr111',
        escrowSequence: 42,
        condition: 'CONDITION_HEX',
        fulfillment: 'FULFILLMENT_HEX',
      });

      expect(mockSubmitAndWait).toHaveBeenCalledTimes(1);
      const [tx, opts] = mockSubmitAndWait.mock.calls[0];

      expect(tx.TransactionType).toBe('EscrowFinish');
      expect(tx.Account).toBe('rSignerAddr789');
      expect(tx.Owner).toBe('rOwnerAddr111');
      expect(tx.OfferSequence).toBe(42);
      expect(tx.Condition).toBe('CONDITION_HEX');
      expect(tx.Fulfillment).toBe('FULFILLMENT_HEX');
      expect(opts.wallet).toBe(mockWallet);
    });

    it('returns txHash and status', async () => {
      const result = await finishEscrow({
        signerWallet: mockWallet,
        escrowOwner: 'rOwnerAddr111',
        escrowSequence: 42,
        condition: 'COND',
        fulfillment: 'FUL',
      });

      expect(result.txHash).toBe('FINISH_TX_HASH_123');
      expect(result.status).toBe('tesSUCCESS');
    });
  });

  // ===========================================
  // cancelEscrow()
  // ===========================================
  describe('cancelEscrow()', () => {
    const mockWallet = {
      classicAddress: 'rCancelAddr222',
    } as Wallet;

    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'CANCEL_TX_HASH_456',
          meta: 'tesSUCCESS',
        },
      });
    });

    it('submits EscrowCancel with correct fields', async () => {
      await cancelEscrow({
        signerWallet: mockWallet,
        escrowOwner: 'rOwnerAddr333',
        escrowSequence: 99,
      });

      expect(mockSubmitAndWait).toHaveBeenCalledTimes(1);
      const [tx, opts] = mockSubmitAndWait.mock.calls[0];

      expect(tx.TransactionType).toBe('EscrowCancel');
      expect(tx.Account).toBe('rCancelAddr222');
      expect(tx.Owner).toBe('rOwnerAddr333');
      expect(tx.OfferSequence).toBe(99);
      expect(opts.wallet).toBe(mockWallet);
    });

    it('returns txHash and status', async () => {
      const result = await cancelEscrow({
        signerWallet: mockWallet,
        escrowOwner: 'rOwnerAddr333',
        escrowSequence: 99,
      });

      expect(result.txHash).toBe('CANCEL_TX_HASH_456');
      expect(result.status).toBe('tesSUCCESS');
    });
  });
});
