/**
 * API Route Tests: Proposals — Direct Offer (MK→CR)
 *
 * Tests:
 *   POST /api/proposals — Create a direct offer from marketplace to creator
 *   Validates the "Make an Offer" modal payload against the API schema.
 */

const mockFrom = jest.fn();

// Use proper UUID format for Zod validation
const MARKETPLACE_UUID = '00000000-0000-4000-a000-000000000001';
const CREATOR_UUID = '00000000-0000-4000-a000-000000000002';

const marketplaceSession = {
  user: { id: MARKETPLACE_UUID, email: 'marketplace1@test.studioledger.local' },
};

let activeSession: any = marketplaceSession;

jest.mock('@/lib/supabase/dev-session', () => ({
  getSessionOrDev: jest.fn().mockImplementation(() =>
    Promise.resolve({
      session: activeSession,
      supabase: { from: mockFrom },
    })
  ),
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/proposals/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, path: string, body?: Record<string, any>): NextRequest {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(`http://localhost:3000${path}`), init);
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

// ─── Valid Direct Offer (MK→CR) ─────────────────────────────────────────────

const validDirectOffer = {
  brief_id: null,
  counterparty_id: CREATOR_UUID,
  direction: 'mk_to_cr',
  terms: {
    template: 'fixed_price',
    title: 'Website Redesign',
    description: 'Full redesign of the company website with responsive layout',
    currency: 'RLUSD',
    total_amount: 2000,
    deadline: '2026-06-01',
    milestones: [{
      sequence: 1,
      title: 'Website Redesign',
      description: 'Full redesign of the company website with responsive layout',
      amount: 2000,
      deadline: '2026-06-01',
    }],
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/proposals — Direct Offer (MK→CR)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = marketplaceSession;
  });

  it('returns 401 if no session', async () => {
    const { getSessionOrDev } = require('@/lib/supabase/dev-session');
    getSessionOrDev.mockResolvedValueOnce({ session: null, supabase: { from: mockFrom } });

    const res = await POST(makeRequest('POST', '/api/proposals', validDirectOffer));
    const { status, body } = await parseRes(res);
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await POST(makeRequest('POST', '/api/proposals', {
      brief_id: null,
      direction: 'mk_to_cr',
      // Missing counterparty_id and terms
    }));
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });

  it('returns 400 if milestone amounts do not equal total', async () => {
    // Mock counterparty lookup
    mockFrom.mockImplementation(() =>
      mockQueryBuilder({ data: { id: CREATOR_UUID, role: 'creator' }, error: null })
    );

    const res = await POST(makeRequest('POST', '/api/proposals', {
      ...validDirectOffer,
      terms: {
        ...validDirectOffer.terms,
        total_amount: 5000, // Mismatch: milestones sum to 2000
      },
    }));
    const { status, body } = await parseRes(res);
    expect(status).toBe(400);
    expect(body.error).toContain('must equal');
  });

  it('returns 404 if counterparty does not exist', async () => {
    mockFrom.mockImplementation(() =>
      mockQueryBuilder({ data: null, error: null })
    );

    const res = await POST(makeRequest('POST', '/api/proposals', validDirectOffer));
    const { status, body } = await parseRes(res);
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });

  it('creates proposal and first round on valid direct offer', async () => {
    const proposalRow = {
      id: 'proposal-1-uuid',
      brief_id: null,
      creator_id: CREATOR_UUID,
      marketplace_id: MARKETPLACE_UUID,
      direction: 'mk_to_cr',
      status: 'pending',
      current_round: 1,
    };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'users') {
        return mockQueryBuilder({ data: { id: CREATOR_UUID, role: 'creator' }, error: null });
      }
      if (table === 'proposals') {
        return mockQueryBuilder({ data: proposalRow, error: null });
      }
      if (table === 'proposal_rounds') {
        return mockQueryBuilder({ data: null, error: null });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await POST(makeRequest('POST', '/api/proposals', validDirectOffer));
    const { status, body } = await parseRes(res);

    expect(status).toBe(201);
    expect(body.proposal).toBeDefined();
    expect(body.proposal.id).toBe('proposal-1-uuid');
    expect(body.proposal.direction).toBe('mk_to_cr');
    expect(body.proposal.status).toBe('pending');
  });

  it('accepts all valid template types in direct offers', async () => {
    const templates = ['fixed_price', 'milestone', 'retainer', 'pay_per_use', 'license_deal', 'subscription'];

    for (const template of templates) {
      const payload = {
        ...validDirectOffer,
        terms: { ...validDirectOffer.terms, template },
      };
      const res = await POST(makeRequest('POST', '/api/proposals', payload));
      const { body } = await parseRes(res);
      // Zod shouldn't reject the template
      if (body.error) {
        expect(body.error).not.toContain('Invalid enum value');
      }
    }
  });

  it('validates description minimum length (10 chars)', async () => {
    const res = await POST(makeRequest('POST', '/api/proposals', {
      ...validDirectOffer,
      terms: { ...validDirectOffer.terms, description: 'Short' }, // < 10 chars
    }));
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });

  it('returns 400 if description is too short', async () => {
    const res = await POST(makeRequest('POST', '/api/proposals', {
      ...validDirectOffer,
      terms: { ...validDirectOffer.terms, description: 'Short' },
    }));
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });
});

describe('GET /api/proposals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = marketplaceSession;
  });

  it('returns 401 if no session', async () => {
    const { getSessionOrDev } = require('@/lib/supabase/dev-session');
    getSessionOrDev.mockResolvedValueOnce({ session: null, supabase: { from: mockFrom } });

    const res = await GET(makeRequest('GET', '/api/proposals'));
    const { status, body } = await parseRes(res);
    expect(status).toBe(401);
  });

  it('returns proposals for authenticated user', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'proposals') {
        const chain: any = new Proxy({}, {
          get: (_target, prop) => {
            if (prop === 'then') return (resolve: Function) => resolve({
              data: [{
                id: 'p1',
                creator_id: CREATOR_UUID,
                marketplace_id: MARKETPLACE_UUID,
                direction: 'mk_to_cr',
                status: 'pending',
                current_round: 1,
                brief_id: null,
              }],
              count: 1,
              error: null,
            });
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      }
      // Users lookup for enrichment
      if (table === 'users') {
        const chain: any = new Proxy({}, {
          get: (_target, prop) => {
            if (prop === 'then') return (resolve: Function) => resolve({
              data: [
                { id: CREATOR_UUID, display_name: 'Creator 1', avatar_url: null, role: 'creator' },
                { id: MARKETPLACE_UUID, display_name: 'Marketplace 1', avatar_url: null, role: 'marketplace' },
              ],
              error: null,
            });
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      }
      // Rounds lookup
      if (table === 'proposal_rounds') {
        const chain: any = new Proxy({}, {
          get: (_target, prop) => {
            if (prop === 'then') return (resolve: Function) => resolve({
              data: [{
                proposal_id: 'p1',
                round_number: 1,
                terms: { title: 'Website Redesign', total_amount: 2000, currency: 'RLUSD' },
              }],
              error: null,
            });
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await GET(makeRequest('GET', '/api/proposals'));
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.proposals).toHaveLength(1);
    expect(body.proposals[0].direction).toBe('mk_to_cr');
    expect(body.proposals[0].creator).toBeDefined();
    expect(body.proposals[0].marketplace).toBeDefined();
    expect(body.proposals[0].latest_terms).toBeDefined();
  });
});
