/**
 * Unit tests for src/lib/xrpl/wallet.ts
 *
 * Tests wallet generation, trust line setup, balance queries,
 * and balance sufficiency checks.
 */

const mockSubmitAndWait = jest.fn();
const mockRequest = jest.fn();
const mockFundWallet = jest.fn();

jest.mock('@/lib/xrpl/client', () => ({
  getXrplClient: jest.fn().mockResolvedValue({
    submitAndWait: mockSubmitAndWait,
    request: mockRequest,
    fundWallet: mockFundWallet,
  }),
}));

jest.mock('@/config/constants', () => ({
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
  GATEHUB_ISSUERS: {
    USD: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    USDC: 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu',
    USDT: 'rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq',
  },
  PLATFORM: {
    FEE_PERCENT: 0.98,
    BASE_RESERVE_XRP: 1,
    OWNER_RESERVE_XRP: 0.2,
  },
  STATIC_EXCHANGE_RATES: {
    USD: 1,
    RLUSD: 1,
    USDC: 1,
    USDT: 1,
    XRP: 1.85,
    EUR: 0.92,
  },
}));

// Mock xrpl Wallet class
jest.mock('xrpl', () => {
  const mockGeneratedWallet = {
    classicAddress: 'rGenerated123',
    publicKey: 'PUBKEY_HEX_123',
    seed: 'sTestSeed123',
  };

  return {
    Wallet: {
      generate: jest.fn(() => mockGeneratedWallet),
      fromSeed: jest.fn((seed: string) => ({
        classicAddress: 'rFromSeed456',
        publicKey: 'PUBKEY_FROM_SEED',
        seed,
      })),
    },
    xrpToDrops: jest.fn((xrp: string) => String(parseFloat(xrp) * 1000000)),
    dropsToXrp: jest.fn((drops: string) => String(parseFloat(drops) / 1000000)),
  };
});

import { generateWallet, setupTrustLines, getBalances, hasBalance } from '@/lib/xrpl/wallet';
import { Wallet } from 'xrpl';

describe('Wallet Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // generateWallet() — Pure function
  // ===========================================
  describe('generateWallet()', () => {
    it('returns address, publicKey, and seed', () => {
      const result = generateWallet();

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('seed');
    });

    it('calls Wallet.generate()', () => {
      generateWallet();
      expect(Wallet.generate).toHaveBeenCalledTimes(1);
    });

    it('returns classicAddress as address', () => {
      const result = generateWallet();
      expect(result.address).toBe('rGenerated123');
    });
  });

  // ===========================================
  // setupTrustLines() — Async
  // ===========================================
  describe('setupTrustLines()', () => {
    const mockWallet = {
      classicAddress: 'rSetupAddr789',
    } as any;

    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: { meta: 'tesSUCCESS' },
      });
    });

    it('creates trust lines for all 5 supported currencies', async () => {
      const results = await setupTrustLines(mockWallet);

      // RLUSD, USD, EUR, USDC, USDT = 5 trust lines
      expect(mockSubmitAndWait).toHaveBeenCalledTimes(5);
      expect(results).toHaveLength(5);
    });

    it('submits TrustSet transactions', async () => {
      await setupTrustLines(mockWallet);

      for (const call of mockSubmitAndWait.mock.calls) {
        const [tx] = call;
        expect(tx.TransactionType).toBe('TrustSet');
        expect(tx.Account).toBe('rSetupAddr789');
      }
    });

    it('sets high limit (1000000) for each trust line', async () => {
      await setupTrustLines(mockWallet);

      for (const call of mockSubmitAndWait.mock.calls) {
        const [tx] = call;
        expect(tx.LimitAmount.value).toBe('1000000');
      }
    });

    it('includes RLUSD trust line with correct issuer', async () => {
      await setupTrustLines(mockWallet);

      const rlusdCall = mockSubmitAndWait.mock.calls.find(
        (call: any[]) => call[0].LimitAmount.currency === 'RLUSD',
      );
      expect(rlusdCall).toBeDefined();
      expect(rlusdCall![0].LimitAmount.issuer).toBe('rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3');
    });

    it('handles individual trust line failures gracefully', async () => {
      // Fail on the 3rd call (EUR)
      mockSubmitAndWait
        .mockResolvedValueOnce({ result: { meta: 'tesSUCCESS' } })
        .mockResolvedValueOnce({ result: { meta: 'tesSUCCESS' } })
        .mockRejectedValueOnce(new Error('Insufficient XRP'))
        .mockResolvedValueOnce({ result: { meta: 'tesSUCCESS' } })
        .mockResolvedValueOnce({ result: { meta: 'tesSUCCESS' } });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const results = await setupTrustLines(mockWallet);

      // Should still try all 5 and return results for each
      expect(results).toHaveLength(5);
      expect(results[2]).toContain('FAILED');

      consoleSpy.mockRestore();
    });
  });

  // ===========================================
  // getBalances() — Async
  // ===========================================
  describe('getBalances()', () => {
    it('returns XRP balance from account_info', async () => {
      mockRequest
        .mockResolvedValueOnce({
          result: {
            account_data: {
              Balance: '50000000', // 50 XRP in drops
              OwnerCount: 3,
            },
          },
        })
        .mockResolvedValueOnce({
          result: { lines: [] },
        });

      const balances = await getBalances('rAddr123');

      expect(balances[0].currency).toBe('XRP');
      expect(balances[0].value).toBe('50');
    });

    it('returns issued currency balances from account_lines', async () => {
      mockRequest
        .mockResolvedValueOnce({
          result: {
            account_data: {
              Balance: '10000000',
              OwnerCount: 2,
            },
          },
        })
        .mockResolvedValueOnce({
          result: {
            lines: [
              { currency: 'RLUSD', balance: '1500.50', account: 'rIssuer1' },
              { currency: 'USD', balance: '200.00', account: 'rIssuer2' },
            ],
          },
        });

      const balances = await getBalances('rAddr123');

      expect(balances).toHaveLength(3); // XRP + RLUSD + USD
      expect(balances[1].currency).toBe('RLUSD');
      expect(balances[1].value).toBe('1500.50');
      expect(balances[1].issuer).toBe('rIssuer1');
    });

    it('returns 0 XRP for unfunded account (actNotFound)', async () => {
      mockRequest.mockRejectedValueOnce({
        data: { error: 'actNotFound' },
      });

      const balances = await getBalances('rNewAddr');

      expect(balances).toHaveLength(1);
      expect(balances[0].currency).toBe('XRP');
      expect(balances[0].value).toBe('0');
    });

    it('throws on non-actNotFound errors', async () => {
      mockRequest.mockRejectedValueOnce({
        data: { error: 'internalError' },
      });

      await expect(getBalances('rAddr')).rejects.toMatchObject({
        data: { error: 'internalError' },
      });
    });

    it('formats display_value correctly', async () => {
      mockRequest
        .mockResolvedValueOnce({
          result: {
            account_data: {
              Balance: '123456789',
              OwnerCount: 0,
            },
          },
        })
        .mockResolvedValueOnce({
          result: { lines: [] },
        });

      const balances = await getBalances('rAddr');
      expect(balances[0].display_value).toMatch(/\d+\.\d+ XRP/);
    });
  });

  // ===========================================
  // hasBalance() — Async
  // ===========================================
  describe('hasBalance()', () => {
    beforeEach(() => {
      mockRequest
        .mockResolvedValueOnce({
          result: {
            account_data: {
              Balance: '100000000', // 100 XRP
              OwnerCount: 1,
            },
          },
        })
        .mockResolvedValueOnce({
          result: {
            lines: [
              { currency: 'RLUSD', balance: '500', account: 'rIssuer1' },
            ],
          },
        });
    });

    it('returns true when balance is sufficient', async () => {
      const result = await hasBalance('rAddr', 'XRP', '50');
      expect(result).toBe(true);
    });

    it('returns true when balance exactly matches', async () => {
      const result = await hasBalance('rAddr', 'RLUSD', '500');
      expect(result).toBe(true);
    });

    it('returns false when balance is insufficient', async () => {
      const result = await hasBalance('rAddr', 'RLUSD', '1000');
      expect(result).toBe(false);
    });

    it('returns false when currency not found', async () => {
      const result = await hasBalance('rAddr', 'EUR', '100');
      expect(result).toBe(false);
    });

    it('filters by issuer when provided', async () => {
      const result = await hasBalance('rAddr', 'RLUSD', '100', 'rIssuer1');
      expect(result).toBe(true);
    });

    it('returns false when issuer does not match', async () => {
      const result = await hasBalance('rAddr', 'RLUSD', '100', 'rWrongIssuer');
      expect(result).toBe(false);
    });
  });
});
