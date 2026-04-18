/**
 * Unit tests for src/lib/xrpl/nft.ts
 *
 * Tests MCC minting (all 3 taxons), token offers, and token retrieval.
 */

const mockSubmitAndWait = jest.fn();
const mockRequest = jest.fn();

jest.mock('@/lib/xrpl/client', () => ({
  getXrplClient: jest.fn().mockResolvedValue({
    submitAndWait: mockSubmitAndWait,
    request: mockRequest,
  }),
}));

jest.mock('@/config/constants', () => ({
  MCC_TAXONS: {
    WORK_CREDENTIAL: 1,
    LICENSE: 2,
    ACCESS_PASS: 3,
  },
}));

import { MCCtokenMint, mintLicense, mintAccessPass, MCCtokenCreateOffer, getMCCs } from '@/lib/xrpl/nft';
import { Wallet, convertStringToHex } from 'xrpl';

describe('NFT / MCC Module', () => {
  const mockWallet = {
    classicAddress: 'rCreator123',
  } as Wallet;

  const sampleMetadata = {
    name: 'MCC: Logo Design',
    description: 'Completed logo design milestone',
    work_category: 'design',
    deliverable_hash: 'abc123hash',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // MCCtokenMint() — Work Credential (Taxon 1)
  // ===========================================
  describe('MCCtokenMint()', () => {
    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'MCC_MINT_TX',
          meta: {
            AffectedNodes: [
              {
                CreatedNode: {
                  LedgerEntryType: 'NFTokenPage',
                  NewFields: {
                    NFTokens: [{ NFToken: { NFTokenID: 'MCC_TOKEN_ID_001' } }],
                  },
                },
              },
            ],
          },
        },
      });
    });

    it('submits NFTokenMint with Taxon 1', async () => {
      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransactionType).toBe('NFTokenMint');
      expect(tx.NFTokenTaxon).toBe(1); // WORK_CREDENTIAL
    });

    it('sets TRANSFERABLE flag (8)', async () => {
      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Flags).toBe(8); // TRANSFERABLE
    });

    it('sets TransferFee to 0 (credential, not commerce)', async () => {
      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransferFee).toBe(0);
    });

    it('encodes URI as hex', async () => {
      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.URI).toBe(convertStringToHex('ipfs://QmTest123'));
    });

    it('includes work_type and deliverable_hash memos', async () => {
      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Memos).toHaveLength(2);

      const memoTypes = tx.Memos.map((m: any) => m.Memo.MemoType);
      expect(memoTypes).toContain(convertStringToHex('work_type'));
      expect(memoTypes).toContain(convertStringToHex('deliverable_hash'));
    });

    it('extracts token ID from transaction metadata', async () => {
      const result = await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      expect(result.nftTokenId).toBe('MCC_TOKEN_ID_001');
      expect(result.txHash).toBe('MCC_MINT_TX');
    });

    it('returns null tokenId when metadata has no NFTokenPage', async () => {
      mockSubmitAndWait.mockResolvedValueOnce({
        result: {
          hash: 'MCC_MINT_TX',
          meta: { AffectedNodes: [] },
        },
      });

      const result = await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmTest123',
      });

      expect(result.nftTokenId).toBeNull();
    });

    it('handles metadata with missing optional fields', async () => {
      const minimalMetadata = {
        name: 'MCC: Task',
        description: 'Task completed',
      };

      await MCCtokenMint({
        creatorWallet: mockWallet,
        metadata: minimalMetadata,
        metadataUri: 'ipfs://QmMin',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      // work_category should default to 'general'
      const workTypeMemo = tx.Memos.find(
        (m: any) => m.Memo.MemoType === convertStringToHex('work_type'),
      );
      expect(workTypeMemo.Memo.MemoData).toBe(convertStringToHex('general'));
    });
  });

  // ===========================================
  // mintLicense() — License (Taxon 2)
  // ===========================================
  describe('mintLicense()', () => {
    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'LICENSE_TX',
          meta: {
            AffectedNodes: [
              {
                CreatedNode: {
                  LedgerEntryType: 'NFTokenPage',
                  NewFields: {
                    NFTokens: [{ NFToken: { NFTokenID: 'LICENSE_ID_001' } }],
                  },
                },
              },
            ],
          },
        },
      });
    });

    it('submits NFTokenMint with Taxon 2', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: true,
        royaltyPercent: 5,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.NFTokenTaxon).toBe(2); // LICENSE
    });

    it('sets BURNABLE flag always', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: false,
        royaltyPercent: 0,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Flags & 1).toBe(1); // BURNABLE bit set
    });

    it('adds TRANSFERABLE flag when transferable=true', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: true,
        royaltyPercent: 5,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Flags & 8).toBe(8); // TRANSFERABLE bit set
      expect(tx.Flags & 1).toBe(1); // BURNABLE still set
    });

    it('calculates TransferFee correctly (percent × 1000)', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: true,
        royaltyPercent: 10,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransferFee).toBe(10000); // 10% × 1000
    });

    it('caps TransferFee at 50000 (50%)', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: true,
        royaltyPercent: 80, // Exceeds 50%
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransferFee).toBe(50000);
    });

    it('sets TransferFee to 0 when not transferable', async () => {
      await mintLicense({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmLicense',
        transferable: false,
        royaltyPercent: 10,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransferFee).toBe(0);
    });
  });

  // ===========================================
  // mintAccessPass() — Access Pass (Taxon 3)
  // ===========================================
  describe('mintAccessPass()', () => {
    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'ACCESS_TX',
          meta: {
            AffectedNodes: [
              {
                CreatedNode: {
                  LedgerEntryType: 'NFTokenPage',
                  NewFields: {
                    NFTokens: [{ NFToken: { NFTokenID: 'ACCESS_ID_001' } }],
                  },
                },
              },
            ],
          },
        },
      });
    });

    it('submits NFTokenMint with Taxon 3', async () => {
      await mintAccessPass({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmAccess',
        transferable: true,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.NFTokenTaxon).toBe(3); // ACCESS_PASS
    });

    it('sets TRANSFERABLE + BURNABLE when transferable', async () => {
      await mintAccessPass({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmAccess',
        transferable: true,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Flags).toBe(9); // TRANSFERABLE (8) | BURNABLE (1)
    });

    it('sets only BURNABLE when not transferable', async () => {
      await mintAccessPass({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmAccess',
        transferable: false,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Flags).toBe(1); // BURNABLE only
    });

    it('always sets TransferFee to 0', async () => {
      await mintAccessPass({
        creatorWallet: mockWallet,
        metadata: sampleMetadata,
        metadataUri: 'ipfs://QmAccess',
        transferable: true,
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransferFee).toBe(0);
    });
  });

  // ===========================================
  // MCCtokenCreateOffer()
  // ===========================================
  describe('MCCtokenCreateOffer()', () => {
    beforeEach(() => {
      mockSubmitAndWait.mockResolvedValue({
        result: {
          hash: 'OFFER_TX',
          meta: 'tesSUCCESS',
        },
      });
    });

    it('creates NFTokenCreateOffer with sell flag', async () => {
      await MCCtokenCreateOffer({
        signerWallet: mockWallet,
        nftTokenId: 'TOKEN_ID_123',
        destinationAddress: 'rDestination456',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.TransactionType).toBe('NFTokenCreateOffer');
      expect(tx.Flags).toBe(1); // tfSellNFToken
    });

    it('defaults Amount to 0 (free credential gift)', async () => {
      await MCCtokenCreateOffer({
        signerWallet: mockWallet,
        nftTokenId: 'TOKEN_ID_123',
        destinationAddress: 'rDestination456',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Amount).toBe('0');
    });

    it('supports custom amount', async () => {
      await MCCtokenCreateOffer({
        signerWallet: mockWallet,
        nftTokenId: 'TOKEN_ID_123',
        destinationAddress: 'rDestination456',
        amount: '1000000', // 1 XRP in drops
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Amount).toBe('1000000');
    });

    it('sets correct destination', async () => {
      await MCCtokenCreateOffer({
        signerWallet: mockWallet,
        nftTokenId: 'TOKEN_ID_123',
        destinationAddress: 'rDestination456',
      });

      const [tx] = mockSubmitAndWait.mock.calls[0];
      expect(tx.Destination).toBe('rDestination456');
      expect(tx.NFTokenID).toBe('TOKEN_ID_123');
    });
  });

  // ===========================================
  // getMCCs()
  // ===========================================
  describe('getMCCs()', () => {
    it('requests account_nfts for the given address', async () => {
      mockRequest.mockResolvedValue({
        result: {
          account_nfts: [
            { NFTokenID: 'TOKEN_1', NFTokenTaxon: 1 },
            { NFTokenID: 'TOKEN_2', NFTokenTaxon: 2 },
          ],
        },
      });

      const result = await getMCCs('rAddress123');

      expect(mockRequest).toHaveBeenCalledWith({
        command: 'account_nfts',
        account: 'rAddress123',
        ledger_index: 'validated',
      });

      expect(result).toHaveLength(2);
      expect(result[0].NFTokenID).toBe('TOKEN_1');
    });

    it('returns empty array when no tokens', async () => {
      mockRequest.mockResolvedValue({
        result: { account_nfts: [] },
      });

      const result = await getMCCs('rEmpty456');
      expect(result).toEqual([]);
    });
  });
});
