/**
 * Unit tests for src/lib/xrpl/mint-credential.ts
 *
 * Tests the auto-minting of MCCs on milestone release:
 *   - Creator Work Credential (Taxon 1)
 *   - Client Completion Record (Taxon 4)
 */

const mockMCCtokenMint = jest.fn();
const mockMCCtokenCreateOffer = jest.fn();

jest.mock('@/lib/xrpl/nft', () => ({
  MCCtokenMint: mockMCCtokenMint,
  MCCtokenCreateOffer: mockMCCtokenCreateOffer,
}));

// Mock xrpl Wallet
jest.mock('xrpl', () => ({
  Wallet: {
    fromSeed: jest.fn((seed: string) => ({
      classicAddress: 'rPlatformAddr',
      seed,
    })),
  },
}));

import { mintCredentialsOnRelease, mintWorkCredentialOnRelease } from '@/lib/xrpl/mint-credential';

const baseParams = {
  creatorAddress: 'rCreator123',
  clientAddress: 'rClient456',
  clientName: 'TechCo Inc.',
  creatorName: 'Alice Martin',
  contractId: 'contract-uuid-1',
  contractTitle: 'Logo Design Project',
  milestoneId: 'milestone-uuid-1',
  milestoneSequence: 1,
  milestoneTitle: 'Initial Concepts',
  deliverableHash: 'sha256:abc123',
  deliverableMediaUrl: 'https://example.com/preview.jpg',
  amount: '500',
  currency: 'RLUSD',
  releaseTxHash: 'RELEASE_TX_123',
};

describe('mintCredentialsOnRelease()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.XRPL_PLATFORM_SECRET = 'sTestPlatformSeed';
    mockMCCtokenMint.mockResolvedValue({ txHash: 'MINT_TX', nftTokenId: 'TOKEN_123' });
    mockMCCtokenCreateOffer.mockResolvedValue({ txHash: 'OFFER_TX' });
  });

  afterEach(() => {
    delete process.env.XRPL_PLATFORM_SECRET;
  });

  it('returns both null when no platform secret configured', async () => {
    delete process.env.XRPL_PLATFORM_SECRET;

    const result = await mintCredentialsOnRelease(baseParams);
    expect(result.creator).toBeNull();
    expect(result.client).toBeNull();
    expect(mockMCCtokenMint).not.toHaveBeenCalled();
  });

  it('mints both Creator (T1) and Client (T4) MCCs', async () => {
    const result = await mintCredentialsOnRelease(baseParams);

    // Two mints: T1 + T4
    expect(mockMCCtokenMint).toHaveBeenCalledTimes(2);
    // Two offers: one to creator, one to client
    expect(mockMCCtokenCreateOffer).toHaveBeenCalledTimes(2);

    expect(result.creator).toBeDefined();
    expect(result.client).toBeDefined();
    expect(result.creator!.nftTokenId).toBe('TOKEN_123');
    expect(result.client!.nftTokenId).toBe('TOKEN_123');
  });

  it('passes correct taxon to each mint call', async () => {
    await mintCredentialsOnRelease(baseParams);

    const calls = mockMCCtokenMint.mock.calls;
    const taxons = calls.map((c: any) => c[0].taxon);
    expect(taxons).toContain(1); // Work Credential
    expect(taxons).toContain(4); // Client Completion
  });

  it('offers Creator MCC to creator address', async () => {
    await mintCredentialsOnRelease(baseParams);

    const offerCalls = mockMCCtokenCreateOffer.mock.calls;
    const destinations = offerCalls.map((c: any) => c[0].destinationAddress);
    expect(destinations).toContain('rCreator123');
    expect(destinations).toContain('rClient456');
  });

  it('includes deliverable_media_url in metadata', async () => {
    const result = await mintCredentialsOnRelease(baseParams);

    expect(result.creator!.metadata.deliverable_media_url).toBe('https://example.com/preview.jpg');
    expect(result.client!.metadata.deliverable_media_url).toBe('https://example.com/preview.jpg');
  });

  it('includes payment info in metadata', async () => {
    const result = await mintCredentialsOnRelease(baseParams);

    expect(result.creator!.metadata.payment_amount).toBe('500');
    expect(result.creator!.metadata.payment_currency).toBe('RLUSD');
  });

  it('skips client MCC when no clientAddress provided', async () => {
    const result = await mintCredentialsOnRelease({
      ...baseParams,
      clientAddress: undefined,
    });

    expect(result.creator).toBeDefined();
    expect(result.client).toBeNull();
    // Only one mint (creator only)
    expect(mockMCCtokenMint).toHaveBeenCalledTimes(1);
  });

  it('handles null deliverableHash and releaseTxHash', async () => {
    const result = await mintCredentialsOnRelease({
      ...baseParams,
      deliverableHash: null,
      deliverableMediaUrl: null,
      releaseTxHash: null,
    });

    expect(result.creator).toBeDefined();
    expect(result.creator!.metadata.deliverable_hash).toBeUndefined();
    expect(result.creator!.metadata.deliverable_media_url).toBeUndefined();
  });

  it('continues minting client MCC even if creator mint fails', async () => {
    let callCount = 0;
    mockMCCtokenMint.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Creator mint failed');
      return { txHash: 'CLIENT_MINT_TX', nftTokenId: 'CLIENT_TOKEN' };
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = await mintCredentialsOnRelease(baseParams);

    expect(result.creator).toBeNull();
    expect(result.client).toBeDefined();
    consoleSpy.mockRestore();
  });
});

describe('mintWorkCredentialOnRelease() — legacy wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.XRPL_PLATFORM_SECRET = 'sTestPlatformSeed';
    mockMCCtokenMint.mockResolvedValue({ txHash: 'MINT_TX', nftTokenId: 'TOKEN_123' });
    mockMCCtokenCreateOffer.mockResolvedValue({ txHash: 'OFFER_TX' });
  });

  afterEach(() => {
    delete process.env.XRPL_PLATFORM_SECRET;
  });

  it('returns legacy shape with mintTxHash, nftTokenId, offerTxHash', async () => {
    const result = await mintWorkCredentialOnRelease({
      creatorAddress: 'rCreator123',
      contractId: 'contract-uuid-1',
      contractTitle: 'Logo Design Project',
      milestoneSequence: 1,
      milestoneTitle: 'Initial Concepts',
      deliverableHash: 'sha256:abc123',
      amount: '500',
      currency: 'RLUSD',
      releaseTxHash: 'RELEASE_TX_123',
    });

    expect(result).toMatchObject({
      mintTxHash: 'MINT_TX',
      nftTokenId: 'TOKEN_123',
      offerTxHash: 'OFFER_TX',
    });
    expect(result!.metadata).toBeDefined();
  });
});
