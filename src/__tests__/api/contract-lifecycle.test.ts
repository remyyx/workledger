/**
 * Integration Test: Contract Lifecycle
 *
 * Validates the full end-to-end flow through the API layer:
 *   1. Creator creates contract (POST /api/contracts) → draft
 *   2. Creator submits work (PATCH milestone: submit) → funded→submitted
 *   3. Marketplace approves (PATCH milestone: approve) → submitted→approved
 *   4. Marketplace requests changes (PATCH milestone: request_changes) → submitted→funded
 *   5. Creator resubmits → funded→submitted
 *   6. Contract completion detection (all milestones released)
 *   7. Dispute opening from both roles
 *
 * Uses mocked DB and XRPL but exercises real route handlers and state machine logic.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = jest.fn();
const mockAdminFrom = jest.fn();

const creatorSession = {
  user: { id: 'user-cr1-uuid', email: 'creator1@test.studioledger.local' },
};
const marketplaceSession = {
  user: { id: 'user-mk1-uuid', email: 'marketplace1@test.studioledger.local' },
};

let activeSession: any = creatorSession;

jest.mock('@/lib/supabase/dev-session', () => ({
  getSessionOrDev: jest.fn().mockImplementation(() =>
    Promise.resolve({
      session: activeSession,
      supabase: { from: mockFrom },
    })
  ),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: jest.fn(() => ({ from: mockAdminFrom })),
}));

jest.mock('@/lib/xrpl/escrow', () => ({
  generateCondition: jest.fn(() => ({
    condition: 'A0258020_MOCK_CONDITION_HEX',
    fulfillment: 'A0228020_MOCK_FULFILLMENT_HEX',
    preimage: 'MOCK_PREIMAGE',
  })),
}));

jest.mock('@/lib/crypto', () => ({
  encryptFulfillment: jest.fn((val: string) => `ENCRYPTED_${val}`),
  decryptFulfillment: jest.fn((val: string) => val.replace('ENCRYPTED_', '')),
  decryptWalletSeed: jest.fn(() => 'sEdFAKESEED123456789'),
}));

jest.mock('@/lib/fees', () => ({
  calculatePlatformFee: jest.fn(() => ({
    total: '1000.000000',
    platformFee: '9.800000',
    net: '990.200000',
  })),
}));

jest.mock('@/lib/math', () => ({
  calcFeeBreakdown: jest.fn().mockReturnValue({
    total: '500.000000',
    platformFee: '4.900000',
    net: '495.100000',
  }),
}));

jest.mock('@/lib/contract-messages', () => ({
  createSystemMessage: jest.fn().mockResolvedValue(undefined),
  createDeliverableMessage: jest.fn().mockResolvedValue(undefined),
  createApprovalMessage: jest.fn().mockResolvedValue(undefined),
  createReleaseMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/n8n', () => ({
  n8n: {
    milestoneFunded: jest.fn(),
    milestoneSubmitted: jest.fn(),
    milestoneApproved: jest.fn(),
    milestoneReleased: jest.fn(),
    mccMinted: jest.fn(),
    disputeOpened: jest.fn(),
  },
}));

jest.mock('@/lib/xrpl/milestone-escrow', () => ({
  fundInitialMilestones: jest.fn(),
  releaseMilestoneAndAdvance: jest.fn(),
  getMilestonesToFund: jest.fn().mockReturnValue([]),
  isContractComplete: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/xrpl/mint-credential', () => ({
  mintCredentialsOnRelease: jest.fn().mockResolvedValue({
    creator: { nftTokenId: 'MCC_TOKEN_CR', metadata: {} },
    client: { nftTokenId: 'MCC_TOKEN_CL', metadata: {} },
  }),
}));

jest.mock('@/lib/xaman', () => ({
  createEscrowPayload: jest.fn(),
  createEscrowFinishPayload: jest.fn(),
  createPaymentPayload: jest.fn(),
  getPayloadStatus: jest.fn(),
}));

jest.mock('xrpl', () => ({
  Wallet: {
    fromSeed: jest.fn(() => ({ classicAddress: 'rSignerTestAddr' })),
  },
}));

jest.mock('@/config/constants', () => ({
  PLATFORM: { FEE_PERCENT: 0.98 },
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
  MCC_TAXONS: { WORK_CREDENTIAL: 1, CLIENT_COMPLETION: 4 },
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/contracts/route';
import { PATCH } from '@/app/api/contracts/[id]/milestones/[seq]/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, path: string, body?: Record<string, any>): NextRequest {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(`http://localhost:3000${path}`), init);
}

function makePatch(body: Record<string, any>): NextRequest {
  return makeRequest('PATCH', '/api/contracts/contract-1/milestones/1', body);
}

async function parseRes(res: Response) {
  return { status: res.status, body: await res.json() };
}

function mockQueryBuilder(result: { data: any; error: any }) {
  const chain: any = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'then') return (resolve: Function) => resolve(result);
      if (prop === 'single') return jest.fn().mockResolvedValue(result);
      return jest.fn().mockReturnValue(chain);
    },
  });
  return chain;
}

const params = { id: 'contract-1-uuid', seq: '1' };

// ─── Lifecycle Test ──────────────────────────────────────────────────────────

describe('Contract Lifecycle — full flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('Step 1: Creator creates contract → status 201, milestones generated', async () => {
    // Mock user lookups (admin)
    mockAdminFrom.mockImplementation((table: string) =>
      mockQueryBuilder({
        data: table === 'users'
          ? { id: 'user-cr1-uuid', role: 'creator', email: 'creator1@test.studioledger.local', display_name: 'Creator 1' }
          : null,
        error: null,
      })
    );

    // Mock contract + milestone inserts (user supabase)
    const contractRow = {
      id: 'contract-1-uuid',
      title: 'Logo Design',
      status: 'draft',
      creator_id: 'user-cr1-uuid',
      marketplace_id: 'user-mk1-uuid',
      template: 'fixed_price',
      currency: 'RLUSD',
      total_amount: 1000,
    };
    const milestoneRows = [
      { id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400, status: 'pending' },
      { id: 'ms-2-uuid', sequence: 2, title: 'Final', amount: 600, status: 'pending' },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') return mockQueryBuilder({ data: contractRow, error: null });
      if (table === 'milestones') return mockQueryBuilder({ data: milestoneRows, error: null });
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await POST(makeRequest('POST', '/api/contracts', {
      title: 'Logo Design',
      template: 'fixed_price',
      marketplaceEmail: 'marketplace1@test.studioledger.local',
      currency: 'RLUSD',
      totalAmount: 1000,
      milestones: [
        { title: 'Concepts', amount: 400, deadline: '2026-05-01' },
        { title: 'Final', amount: 600, deadline: '2026-05-15' },
      ],
    }));
    const { status, body } = await parseRes(res);

    expect(status).toBe(201);
    expect(body.contract.id).toBe('contract-1-uuid');
    expect(body.contract.milestones).toHaveLength(2);
    expect(body.contract.milestones[0].status).toBe('pending');
  });

  it('Step 2: Creator submits work on funded milestone → funded→submitted', async () => {
    activeSession = creatorSession;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        return mockQueryBuilder({
          data: {
            id: 'contract-1-uuid',
            creator_id: 'user-cr1-uuid',
            marketplace_id: 'user-mk1-uuid',
            template: 'fixed_price',
            status: 'funded',
            currency: 'RLUSD',
            milestones: [{
              id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400,
              status: 'funded', condition: 'COND', fulfillment: 'FUL',
              escrow_tx_hash: 'FUND_TX', escrow_sequence: 42,
              deliverable_hash: null, deliverable_notes: null,
              deliverable_media_url: null, deliverable_doc_url: null,
            }],
          },
          error: null,
        });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await PATCH(
      makePatch({
        action: 'submit',
        deliverableHash: 'SHA256_HASH_LOGOS',
        deliverableNotes: 'Three logo concepts in PDF',
        deliverableMediaUrl: 'https://cdn.studioledger.ai/preview.png',
      }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.milestone.status).toBe('submitted');
    expect(body.message).toContain('submitted');
  });

  it('Step 3: Marketplace approves submitted work → submitted→approved', async () => {
    activeSession = marketplaceSession;

    mockFrom.mockImplementation(() =>
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'user-cr1-uuid',
          marketplace_id: 'user-mk1-uuid',
          template: 'fixed_price',
          status: 'active',
          currency: 'RLUSD',
          milestones: [{
            id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400,
            status: 'submitted', condition: 'COND', fulfillment: 'FUL',
            escrow_tx_hash: 'FUND_TX', escrow_sequence: 42,
            deliverable_hash: 'SHA256_HASH_LOGOS',
            deliverable_notes: 'Three logo concepts in PDF',
            deliverable_media_url: 'https://cdn.studioledger.ai/preview.png',
            deliverable_doc_url: null,
          }],
        },
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'approve' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.milestone.status).toBe('approved');
  });

  it('Step 4: Marketplace requests changes → submitted→funded (deliverables cleared)', async () => {
    activeSession = marketplaceSession;

    const milestoneUpdates: any[] = [];

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: null, error: null });
          if (prop === 'single') {
            return jest.fn().mockResolvedValue({
              data: {
                id: 'contract-1-uuid',
                creator_id: 'user-cr1-uuid',
                marketplace_id: 'user-mk1-uuid',
                template: 'fixed_price',
                status: 'active',
                currency: 'RLUSD',
                milestones: [{
                  id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400,
                  status: 'submitted', condition: 'COND', fulfillment: 'FUL',
                  escrow_tx_hash: 'FUND_TX', escrow_sequence: 42,
                  deliverable_hash: 'OLD_HASH', deliverable_notes: 'Old notes',
                  deliverable_media_url: 'https://old.url', deliverable_doc_url: null,
                }],
              },
              error: null,
            });
          }
          if (prop === 'update' && table === 'milestones') {
            return jest.fn().mockImplementation((data: any) => {
              milestoneUpdates.push(data);
              return chain;
            });
          }
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await PATCH(
      makePatch({ action: 'request_changes', reason: 'Need bolder colors' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.milestone.status).toBe('funded');
    expect(body.milestone.submitted_at).toBeNull();

    // Deliverables must be wiped so creator starts fresh
    const update = milestoneUpdates[0];
    expect(update.deliverable_hash).toBeNull();
    expect(update.deliverable_notes).toBeNull();
    expect(update.deliverable_media_url).toBeNull();
  });

  it('Step 5: Creator resubmits after changes → funded→submitted again', async () => {
    activeSession = creatorSession;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        return mockQueryBuilder({
          data: {
            id: 'contract-1-uuid',
            creator_id: 'user-cr1-uuid',
            marketplace_id: 'user-mk1-uuid',
            template: 'fixed_price',
            status: 'active',
            currency: 'RLUSD',
            milestones: [{
              id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400,
              status: 'funded', condition: 'COND', fulfillment: 'FUL',
              escrow_tx_hash: 'FUND_TX', escrow_sequence: 42,
              deliverable_hash: null, deliverable_notes: null,
              deliverable_media_url: null, deliverable_doc_url: null,
            }],
          },
          error: null,
        });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await PATCH(
      makePatch({
        action: 'submit',
        deliverableHash: 'SHA256_REVISED_LOGOS',
        deliverableNotes: 'Revised with bolder colors',
      }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.milestone.status).toBe('submitted');
  });
});

// ─── Role Enforcement Across Lifecycle ───────────────────────────────────────

describe('Role enforcement — wrong role blocked at each step', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marketplace cannot submit work', async () => {
    activeSession = marketplaceSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'user-cr1-uuid',
          marketplace_id: 'user-mk1-uuid',
          status: 'active',
          milestones: [{
            id: 'ms-1-uuid', sequence: 1, status: 'funded',
            condition: 'C', fulfillment: 'F',
            escrow_tx_hash: null, escrow_sequence: null,
            deliverable_hash: null, deliverable_notes: null,
            deliverable_media_url: null, deliverable_doc_url: null,
          }],
        },
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'submit' }), { params });
    const { status } = await parseRes(res);
    expect(status).toBe(403);
  });

  it('creator cannot approve their own work', async () => {
    activeSession = creatorSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'user-cr1-uuid',
          marketplace_id: 'user-mk1-uuid',
          status: 'active',
          milestones: [{
            id: 'ms-1-uuid', sequence: 1, status: 'submitted',
            condition: 'C', fulfillment: 'F',
            escrow_tx_hash: null, escrow_sequence: null,
            deliverable_hash: 'H', deliverable_notes: 'N',
            deliverable_media_url: null, deliverable_doc_url: null,
          }],
        },
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'approve' }), { params });
    const { status } = await parseRes(res);
    expect(status).toBe(403);
  });

  it('creator cannot release funds to themselves', async () => {
    activeSession = creatorSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'user-cr1-uuid',
          marketplace_id: 'user-mk1-uuid',
          status: 'active',
          milestones: [{
            id: 'ms-1-uuid', sequence: 1, status: 'approved',
            condition: 'C', fulfillment: 'F',
            escrow_tx_hash: 'TX', escrow_sequence: 42,
            deliverable_hash: 'H', deliverable_notes: 'N',
            deliverable_media_url: null, deliverable_doc_url: null,
          }],
        },
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'release' }), { params });
    const { status } = await parseRes(res);
    expect(status).toBe(403);
  });
});

// ─── Invalid State Transitions ───────────────────────────────────────────────

describe('Invalid state transitions blocked', () => {
  beforeEach(() => jest.clearAllMocks());

  const transitions = [
    { action: 'submit', fromStatus: 'pending', role: 'creator', desc: 'submit on pending' },
    { action: 'submit', fromStatus: 'submitted', role: 'creator', desc: 'double submit' },
    { action: 'submit', fromStatus: 'approved', role: 'creator', desc: 'submit after approved' },
    { action: 'submit', fromStatus: 'released', role: 'creator', desc: 'submit after released' },
    { action: 'approve', fromStatus: 'funded', role: 'marketplace', desc: 'approve before submit' },
    { action: 'approve', fromStatus: 'approved', role: 'marketplace', desc: 'double approve' },
    { action: 'approve', fromStatus: 'released', role: 'marketplace', desc: 'approve after release' },
    { action: 'request_changes', fromStatus: 'funded', role: 'marketplace', desc: 'request changes on funded' },
    { action: 'request_changes', fromStatus: 'approved', role: 'marketplace', desc: 'request changes after approved' },
  ];

  it.each(transitions)('blocks $desc', async ({ action, fromStatus, role }) => {
    activeSession = role === 'creator' ? creatorSession : marketplaceSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'user-cr1-uuid',
          marketplace_id: 'user-mk1-uuid',
          status: 'active',
          milestones: [{
            id: 'ms-1-uuid', sequence: 1, status: fromStatus,
            condition: 'C', fulfillment: 'F',
            escrow_tx_hash: fromStatus !== 'pending' ? 'TX' : null,
            escrow_sequence: fromStatus !== 'pending' ? 42 : null,
            deliverable_hash: null, deliverable_notes: null,
            deliverable_media_url: null, deliverable_doc_url: null,
          }],
        },
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action }), { params });
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });
});

// ─── Dispute from Both Roles ─────────────────────────────────────────────────

describe('Dispute — both roles can open on active milestones', () => {
  beforeEach(() => jest.clearAllMocks());

  const disputeScenarios = [
    { role: 'creator', msStatus: 'funded' },
    { role: 'creator', msStatus: 'submitted' },
    { role: 'marketplace', msStatus: 'funded' },
    { role: 'marketplace', msStatus: 'submitted' },
    { role: 'marketplace', msStatus: 'approved' },
  ];

  it.each(disputeScenarios)('$role disputes $msStatus milestone → 200', async ({ role, msStatus }) => {
    activeSession = role === 'creator' ? creatorSession : marketplaceSession;

    const contractData = {
      id: 'contract-1-uuid',
      creator_id: 'user-cr1-uuid',
      marketplace_id: 'user-mk1-uuid',
      status: 'active',
      currency: 'RLUSD',
      milestones: [{
        id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400, status: msStatus,
        condition: 'C', fulfillment: 'F',
        escrow_tx_hash: 'TX', escrow_sequence: 42,
        deliverable_hash: null, deliverable_notes: null,
        deliverable_media_url: null, deliverable_doc_url: null,
      }],
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'disputes') {
        return mockQueryBuilder({ data: { id: 'dispute-uuid' }, error: null });
      }
      // contracts, milestones — all other tables get the contract data or null
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: null, error: null });
          if (prop === 'single') return jest.fn().mockResolvedValue({ data: contractData, error: null });
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await PATCH(
      makePatch({ action: 'dispute', reason: 'Test dispute' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.disputeId).toBeDefined();
  });

  it('neither role can dispute a released milestone', async () => {
    activeSession = creatorSession;

    const contractData = {
      id: 'contract-1-uuid',
      creator_id: 'user-cr1-uuid',
      marketplace_id: 'user-mk1-uuid',
      status: 'active',
      currency: 'RLUSD',
      milestones: [{
        id: 'ms-1-uuid', sequence: 1, title: 'Concepts', amount: 400, status: 'released',
        condition: 'C', fulfillment: 'F',
        escrow_tx_hash: 'TX', escrow_sequence: 42,
        deliverable_hash: null, deliverable_notes: null,
        deliverable_media_url: null, deliverable_doc_url: null,
      }],
    };

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: null, error: null });
          if (prop === 'single') return jest.fn().mockResolvedValue({ data: contractData, error: null });
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await PATCH(
      makePatch({ action: 'dispute', reason: 'Too late' }),
      { params }
    );
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });
});
