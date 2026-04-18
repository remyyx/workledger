/**
 * API Route Tests: Test Milestone Lifecycle
 *
 * Tests the test-mode milestone endpoints:
 *   POST /api/test/milestones/fund    — mock-funds a milestone (no XRPL)
 *   POST /api/test/milestones/release — mock-releases + mock-mints MCCs
 *
 * These endpoints are the dev-mode shortcut for the full pipeline.
 * They test the same state machine logic as production but skip XRPL signing.
 *
 * State machine under test:
 *   pending → funded → submitted → approved → released
 *   (submit/approve are done via PATCH /api/contracts/[id]/milestones/[seq])
 */

// ─── Mocks (must be before imports) ──────────────────────────────────────────

const mockFrom = jest.fn();
const mockSession = {
  user: { id: 'user-mk1-uuid', email: 'marketplace1@test.studioledger.local' },
};

// Mock getSessionOrDev to return our controlled session
jest.mock('@/lib/supabase/dev-session', () => ({
  getSessionOrDev: jest.fn().mockResolvedValue({
    session: mockSession,
    supabase: { from: mockFrom },
  }),
}));

// Mock contract-messages (fire-and-forget, don't need real DB)
jest.mock('@/lib/contract-messages', () => ({
  createSystemMessage: jest.fn().mockResolvedValue(undefined),
  createDeliverableMessage: jest.fn().mockResolvedValue(undefined),
  createApprovalMessage: jest.fn().mockResolvedValue(undefined),
  createReleaseMessage: jest.fn().mockResolvedValue(undefined),
}));

// Mock n8n (fire-and-forget)
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

// Mock calcFeeBreakdown
jest.mock('@/lib/math', () => ({
  calcFeeBreakdown: jest.fn().mockReturnValue({
    total: '500.000000',
    platformFee: '4.900000',
    net: '495.100000',
  }),
}));

// Mock constants
jest.mock('@/config/constants', () => ({
  PLATFORM: { FEE_PERCENT: 0.98 },
  MCC_TAXONS: { WORK_CREDENTIAL: 1, CLIENT_COMPLETION: 4 },
}));

import { NextRequest } from 'next/server';
import { POST as fundEndpoint } from '@/app/api/test/milestones/fund/route';
import { POST as releaseEndpoint } from '@/app/api/test/milestones/release/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, any>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/test/milestones/fund'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseRes(res: Response) {
  return { status: res.status, body: await res.json() };
}

// Chainable mock builder for Supabase queries
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

// ─── Test Data ────────────────────────────────────────────────────────────────

const milestone1 = {
  id: 'ms-1-uuid',
  contract_id: 'contract-1-uuid',
  sequence: 1,
  title: 'Design mockups',
  amount: 500,
  status: 'pending',
  escrow_tx_hash: null,
  condition: 'COND_HEX',
  fulfillment: 'FULFILL_HEX',
};

const milestone2 = {
  ...milestone1,
  id: 'ms-2-uuid',
  sequence: 2,
  title: 'Build frontend',
  status: 'pending',
};

const contract = {
  id: 'contract-1-uuid',
  creator_id: 'user-cr1-uuid',
  marketplace_id: 'user-mk1-uuid',
  template: 'fixed_price',
  title: 'Test Project',
  status: 'draft',
  currency: 'RLUSD',
  total_amount: 1000,
  milestones: [milestone1, milestone2],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/test/milestones/fund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV to development for test routes
    process.env.NODE_ENV = 'test';
  });

  it('returns 400 if contractId or milestoneId missing', async () => {
    const res = await fundEndpoint(makeRequest({ contractId: 'abc' }));
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('milestoneId');
  });

  it('returns 404 if contract not found', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: null, error: null })
    );

    const res = await fundEndpoint(
      makeRequest({ contractId: 'nonexistent', milestoneId: 'ms-1-uuid' })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(404);
    expect(body.error).toBe('Contract not found.');
  });

  it('returns 404 if milestone not found in contract', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: { ...contract, milestones: [milestone1] },
        error: null,
      })
    );

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: 'wrong-ms-id' })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(404);
    expect(body.error).toBe('Milestone not found.');
  });

  it('returns 403 if user is not a party to the contract', async () => {
    // Session user is mk1, but contract has different marketplace
    const foreignContract = {
      ...contract,
      creator_id: 'other-user-1',
      marketplace_id: 'other-user-2',
    };

    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: foreignContract, error: null })
    );

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(403);
    expect(body.error).toContain('Not authorized');
  });

  it('returns 400 if milestone is not in pending status', async () => {
    const fundedMs = { ...milestone1, status: 'funded' };
    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: { ...contract, milestones: [fundedMs, milestone2] },
        error: null,
      })
    );

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('funded');
    expect(body.error).toContain('expected pending');
  });

  it('enforces sequential funding — cannot skip a pending milestone', async () => {
    // ms1 is pending, ms2 is pending — trying to fund ms2 should fail
    // because ms1 is the first pending milestone and hasn't been funded yet
    const ms1Pending = { ...milestone1, status: 'pending' };
    const ms2Pending = { ...milestone2, status: 'pending' };

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: { ...contract, milestones: [ms1Pending, ms2Pending] },
        error: null,
      })
    );

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone2.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('in order');
  });

  it('allows funding ms2 when ms1 is already funded (only one pending check)', async () => {
    // NOTE: The current guard allows this because nextFundable = ms2 (first pending)
    // and nextFundable.id === milestoneId. The blocking check is skipped.
    // This means "sequential" enforces order of funding, not one-at-a-time.
    // If one-at-a-time is needed, a separate guard should be added.
    const ms1Funded = { ...milestone1, status: 'funded' };
    const ms2Pending = { ...milestone2, status: 'pending' };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return mockQueryBuilder({
          data: { ...contract, milestones: [ms1Funded, ms2Pending] },
          error: null,
        });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone2.id })
    );
    const { status, body } = await parseRes(res);

    // Current behavior: this succeeds (guard doesn't block)
    expect(status).toBe(200);
    expect(body.message).toContain('funded');
  });

  it('successfully funds the first pending milestone', async () => {
    // Set up chainable mocks for the update + insert calls
    const updateChain = mockQueryBuilder({ data: null, error: null });
    const insertChain = mockQueryBuilder({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      // First call: select contract
      if (callCount === 1) {
        return mockQueryBuilder({
          data: { ...contract, milestones: [milestone1, milestone2] },
          error: null,
        });
      }
      // Subsequent: update milestone, update contract, insert transaction_log
      if (table === 'milestones' || table === 'contracts') return updateChain;
      if (table === 'transaction_log') return insertChain;
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await fundEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('funded');
    expect(body.milestoneId).toBe(milestone1.id);
    expect(body.txHash).toMatch(/^TEST_TX_/);
  });
});

describe('POST /api/test/milestones/release', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('returns 400 if milestone is not approved', async () => {
    const fundedMs = {
      ...milestone1,
      status: 'funded',
      escrow_tx_hash: 'TEST_TX_123',
    };

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: { ...contract, milestones: [fundedMs] },
        error: null,
      })
    );

    const res = await releaseEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('expected approved');
  });

  it('returns 400 if milestone was not test-funded', async () => {
    const realFundedMs = {
      ...milestone1,
      status: 'approved',
      escrow_tx_hash: 'REAL_TX_HASH_FROM_XRPL', // Not a TEST_TX_ prefix
    };

    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: { ...contract, milestones: [realFundedMs] },
        error: null,
      })
    );

    const res = await releaseEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('not test-funded');
  });

  it('successfully releases an approved test-funded milestone', async () => {
    const approvedMs = {
      ...milestone1,
      status: 'approved',
      escrow_tx_hash: 'TEST_TX_12345',
      sequence: 1,
    };

    // Track all supabase calls
    const calls: Array<{ table: string; method: string }> = [];

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') {
            // For the contract select (first call)
            if (table === 'contracts' && calls.filter(c => c.table === 'contracts').length === 0) {
              calls.push({ table, method: 'select' });
              return (resolve: Function) => resolve({
                data: { ...contract, status: 'active', milestones: [approvedMs] },
                error: null,
              });
            }
            calls.push({ table, method: 'terminal' });
            return (resolve: Function) => resolve({ data: null, error: null });
          }
          if (prop === 'single') {
            if (table === 'contracts' && calls.filter(c => c.table === 'contracts' && c.method === 'single').length === 0) {
              calls.push({ table, method: 'single' });
              return jest.fn().mockResolvedValue({
                data: { ...contract, status: 'active', milestones: [approvedMs] },
                error: null,
              });
            }
            if (table === 'users') {
              calls.push({ table, method: 'single' });
              return jest.fn().mockResolvedValue({
                data: { xrpl_address: 'rTestAddr', display_name: 'Test User' },
                error: null,
              });
            }
            calls.push({ table, method: 'single' });
            return jest.fn().mockResolvedValue({ data: null, error: null });
          }
          calls.push({ table, method: String(prop) });
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await releaseEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('released');
    expect(body.releaseTxHash).toMatch(/^TEST_RELEASE_/);
    expect(body.mccsMinted).toBeGreaterThanOrEqual(0); // MCCs are non-blocking
  });

  it('marks contract completed when all milestones released', async () => {
    // Single milestone contract — releasing it completes the contract
    const singleApprovedMs = {
      ...milestone1,
      status: 'approved',
      escrow_tx_hash: 'TEST_TX_12345',
      sequence: 1,
    };

    const contractUpdates: any[] = [];

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') {
            return (resolve: Function) => resolve({ data: null, error: null });
          }
          if (prop === 'single') {
            if (table === 'contracts') {
              return jest.fn().mockResolvedValue({
                data: { ...contract, status: 'active', milestones: [singleApprovedMs] },
                error: null,
              });
            }
            if (table === 'users') {
              return jest.fn().mockResolvedValue({
                data: { xrpl_address: 'rTestAddr', display_name: 'Test User' },
                error: null,
              });
            }
            return jest.fn().mockResolvedValue({ data: null, error: null });
          }
          if (prop === 'update' && table === 'contracts') {
            return jest.fn().mockImplementation((updateData: any) => {
              contractUpdates.push(updateData);
              return chain;
            });
          }
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await releaseEndpoint(
      makeRequest({ contractId: contract.id, milestoneId: milestone1.id })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.contractCompleted).toBe(true);
  });
});
