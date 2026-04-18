/**
 * API Route Tests: Contract Creation & Management
 *
 * Tests:
 *   POST /api/contracts — Create a new contract with milestones
 *   GET  /api/contracts — List contracts for authenticated user
 *   GET  /api/contracts/[id] — Fetch single contract with milestones
 *   PATCH /api/contracts/[id] — Update contract fields
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

let activeSession = creatorSession;

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

jest.mock('@/lib/fees', () => ({
  calculatePlatformFee: jest.fn(() => ({
    total: '1000.000000',
    platformFee: '9.800000',
    net: '990.200000',
  })),
}));

jest.mock('@/lib/contract-messages', () => ({
  createSystemMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/crypto', () => ({
  encryptFulfillment: jest.fn((val: string) => `ENCRYPTED_${val}`),
  decryptFulfillment: jest.fn((val: string) => val.replace('ENCRYPTED_', '')),
}));

jest.mock('@/config/constants', () => ({
  PLATFORM: { FEE_PERCENT: 0.98 },
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/contracts/route';
import { GET as getContract, PATCH as patchContract } from '@/app/api/contracts/[id]/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  path: string,
  body?: Record<string, any>,
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(`http://localhost:3000${path}`), init);
}

async function parseRes(res: Response) {
  return { status: res.status, body: await res.json() };
}

function mockQueryBuilder(result: { data: any; error: any; count?: number }) {
  const chain: any = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'then') return (resolve: Function) => resolve(result);
      if (prop === 'single') return jest.fn().mockResolvedValue(result);
      return jest.fn().mockReturnValue(chain);
    },
  });
  return chain;
}

// ─── Valid Contract Payload ───────────────────────────────────────────────────

const validContractPayload = {
  title: 'Logo Design Project',
  description: 'Design a new logo for StudioLedger',
  template: 'fixed_price',
  marketplaceEmail: 'marketplace1@test.studioledger.local',
  currency: 'RLUSD',
  totalAmount: 1000,
  milestones: [
    { title: 'Initial concepts', description: 'Three design options', amount: 400, deadline: '2026-05-01' },
    { title: 'Final delivery', description: 'Chosen design in all formats', amount: 600, deadline: '2026-05-15' },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('returns 401 if no session', async () => {
    activeSession = null as any;
    // Override the mock for this test
    const { getSessionOrDev } = require('@/lib/supabase/dev-session');
    getSessionOrDev.mockResolvedValueOnce({ session: null, supabase: { from: mockFrom } });

    const res = await POST(makeRequest('POST', '/api/contracts', validContractPayload));
    const { status, body } = await parseRes(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid payload (missing title)', async () => {
    const res = await POST(
      makeRequest('POST', '/api/contracts', { ...validContractPayload, title: '' })
    );
    const { status } = await parseRes(res);

    expect(status).toBe(400);
  });

  it('returns 400 if milestone amounts do not sum to total', async () => {
    const res = await POST(
      makeRequest('POST', '/api/contracts', {
        ...validContractPayload,
        milestones: [
          { title: 'Only one', amount: 500 }, // 500 ≠ 1000 total
        ],
      })
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('Milestone amounts must equal');
  });

  it('returns 400 for invalid template type', async () => {
    const res = await POST(
      makeRequest('POST', '/api/contracts', {
        ...validContractPayload,
        template: 'invalid_template',
      })
    );
    const { status } = await parseRes(res);

    expect(status).toBe(400);
  });

  it('returns 400 for invalid currency', async () => {
    const res = await POST(
      makeRequest('POST', '/api/contracts', {
        ...validContractPayload,
        currency: 'DOGECOIN',
      })
    );
    const { status } = await parseRes(res);

    expect(status).toBe(400);
  });

  it('successfully creates contract with milestones (creator role)', async () => {
    // Mock user lookup (current user role)
    mockAdminFrom.mockImplementation((table: string) => {
      return mockQueryBuilder({
        data: table === 'users'
          ? { id: 'user-cr1-uuid', role: 'creator', email: 'creator1@test.studioledger.local', display_name: 'Creator 1' }
          : null,
        error: null,
      });
    });

    // Mock contract + milestone inserts
    const contractRow = {
      id: 'new-contract-uuid',
      ...validContractPayload,
      status: 'draft',
      creator_id: creatorSession.user.id,
      marketplace_id: 'user-mk1-uuid',
    };

    const milestoneRows = validContractPayload.milestones.map((m, i) => ({
      id: `ms-${i + 1}-uuid`,
      sequence: i + 1,
      title: m.title,
      amount: m.amount,
      deadline: m.deadline,
      status: 'pending',
    }));

    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'contracts') {
        return mockQueryBuilder({ data: contractRow, error: null });
      }
      if (table === 'milestones') {
        return mockQueryBuilder({ data: milestoneRows, error: null });
      }
      if (table === 'users') {
        return mockQueryBuilder({ data: { email: creatorSession.user.email }, error: null });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await POST(makeRequest('POST', '/api/contracts', validContractPayload));
    const { status, body } = await parseRes(res);

    expect(status).toBe(201);
    expect(body.contract).toBeDefined();
    expect(body.contract.id).toBe('new-contract-uuid');
    expect(body.contract.milestones).toHaveLength(2);
  });

  it('accepts all valid template types', async () => {
    const templates = ['fixed_price', 'milestone', 'retainer', 'pay_per_use', 'license_deal', 'subscription'];

    for (const template of templates) {
      const payload = {
        ...validContractPayload,
        template,
        // retainer template doesn't require milestone sum = total
        ...(template === 'retainer' ? {
          retainer: {
            monthlyAmount: 1000,
            startDate: '2026-05-01',
            durationMonths: 6,
            hoursPerMonth: 40,
          },
        } : {}),
      };

      // Should not throw validation error
      const res = await POST(makeRequest('POST', '/api/contracts', payload));
      // We don't care about DB mocks here — just that Zod accepts the template
      // Status could be 400 (milestone sum) for non-retainer, or 500 (mock DB)
      // But NOT a Zod validation error about template
      const { body } = await parseRes(res);
      if (body.error) {
        expect(body.error).not.toContain('Invalid enum value');
      }
    }
  });

  it('accepts all valid currency types', async () => {
    const currencies = ['XRP', 'RLUSD', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'USDC', 'USDT'];

    for (const currency of currencies) {
      const payload = { ...validContractPayload, currency };
      const res = await POST(makeRequest('POST', '/api/contracts', payload));
      const { body } = await parseRes(res);
      if (body.error) {
        expect(body.error).not.toContain('Invalid enum value');
      }
    }
  });
});

describe('GET /api/contracts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('returns 404 if user is not a party to the contract', async () => {
    mockFrom.mockImplementation(() =>
      mockQueryBuilder({
        data: {
          id: 'contract-1-uuid',
          creator_id: 'other-user-1',
          marketplace_id: 'other-user-2',
          milestones: [],
        },
        error: null,
      })
    );

    const res = await getContract(
      makeRequest('GET', '/api/contracts/contract-1-uuid'),
      { params: { id: 'contract-1-uuid' } }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(404);
    expect(body.error).toBe('Contract not found.');
  });

  it('returns contract with sorted milestones and user role', async () => {
    const ms1 = { id: 'ms-1', sequence: 2, status: 'pending', pow_nft_id: null };
    const ms2 = { id: 'ms-2', sequence: 1, status: 'released', pow_nft_id: null };

    let callIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      callIndex++;
      if (table === 'contracts') {
        return mockQueryBuilder({
          data: {
            id: 'contract-1-uuid',
            creator_id: creatorSession.user.id,
            marketplace_id: 'user-mk1-uuid',
            milestones: [ms1, ms2],
            metadata: {},
          },
          error: null,
        });
      }
      if (table === 'transaction_log') {
        return mockQueryBuilder({ data: [], error: null });
      }
      if (table === 'users') {
        return mockQueryBuilder({
          data: { display_name: 'Marketplace 1', xrpl_address: 'rMk1Addr' },
          error: null,
        });
      }
      if (table === 'nft_registry') {
        return mockQueryBuilder({ data: [], error: null });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await getContract(
      makeRequest('GET', '/api/contracts/contract-1-uuid'),
      { params: { id: 'contract-1-uuid' } }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.userRole).toBe('creator');
    expect(body.contract.milestones[0].sequence).toBe(1); // sorted
    expect(body.contract.milestones[1].sequence).toBe(2);
  });
});

describe('PATCH /api/contracts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('returns 400 if no valid fields to update', async () => {
    mockFrom.mockImplementation(() =>
      mockQueryBuilder({
        data: {
          creator_id: creatorSession.user.id,
          marketplace_id: 'user-mk1-uuid',
        },
        error: null,
      })
    );

    const res = await patchContract(
      makeRequest('PATCH', '/api/contracts/contract-1-uuid', { randomField: 'value' }),
      { params: { id: 'contract-1-uuid' } }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('No valid fields');
  });

  it('allows updating title and description', async () => {
    const updatedContract = {
      id: 'contract-1-uuid',
      title: 'Updated Title',
      description: 'Updated description',
    };

    let selectDone = false;
    mockFrom.mockImplementation(() => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: updatedContract, error: null });
          if (prop === 'single') {
            if (!selectDone) {
              selectDone = true;
              return jest.fn().mockResolvedValue({
                data: { creator_id: creatorSession.user.id, marketplace_id: 'mk1' },
                error: null,
              });
            }
            return jest.fn().mockResolvedValue({ data: updatedContract, error: null });
          }
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await patchContract(
      makeRequest('PATCH', '/api/contracts/contract-1-uuid', {
        title: 'Updated Title',
        description: 'Updated description',
      }),
      { params: { id: 'contract-1-uuid' } }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.contract).toBeDefined();
  });

  it('allows updating license_terms', async () => {
    const licenseTerms = {
      rights: 'Full commercial use',
      territory: 'Worldwide',
      duration: 'Perpetual',
      exclusivity: 'non-exclusive',
    };

    let selectDone = false;
    mockFrom.mockImplementation(() => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: { id: 'c1', license_terms: licenseTerms }, error: null });
          if (prop === 'single') {
            if (!selectDone) {
              selectDone = true;
              return jest.fn().mockResolvedValue({
                data: { creator_id: creatorSession.user.id, marketplace_id: 'mk1' },
                error: null,
              });
            }
            return jest.fn().mockResolvedValue({ data: { id: 'c1', license_terms: licenseTerms }, error: null });
          }
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await patchContract(
      makeRequest('PATCH', '/api/contracts/contract-1-uuid', { license_terms: licenseTerms }),
      { params: { id: 'contract-1-uuid' } }
    );
    const { status } = await parseRes(res);

    expect(status).toBe(200);
  });
});
