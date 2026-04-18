/**
 * API Route Tests: Milestone Actions (PATCH /api/contracts/[id]/milestones/[seq])
 *
 * Tests the production milestone state machine:
 *   submit         — Creator submits work (funded → submitted)
 *   approve        — Marketplace approves (submitted → approved)
 *   request_changes — Marketplace rejects (submitted → funded, clears deliverables)
 *   release        — Marketplace releases funds (approved → released) + MCC mint
 *   dispute        — Either party disputes (funded|submitted|approved → disputed)
 *
 * Also tests role enforcement (who can do what) and invalid state transitions.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = jest.fn();

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

jest.mock('@/lib/math', () => ({
  calcFeeBreakdown: jest.fn().mockReturnValue({
    total: '500.000000',
    platformFee: '4.900000',
    net: '495.100000',
  }),
}));

jest.mock('@/lib/xrpl/milestone-escrow', () => ({
  fundInitialMilestones: jest.fn(),
  releaseMilestoneAndAdvance: jest.fn(),
  getMilestonesToFund: jest.fn().mockReturnValue([1]),
  isContractComplete: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/xrpl/mint-credential', () => ({
  mintCredentialsOnRelease: jest.fn().mockResolvedValue({ creator: null, client: null }),
}));

jest.mock('@/lib/xrpl/escrow', () => ({
  generateCondition: jest.fn(() => ({
    condition: 'MOCK_COND',
    fulfillment: 'MOCK_FULFILL',
  })),
}));

jest.mock('@/lib/xaman', () => ({
  createEscrowPayload: jest.fn(),
  createEscrowFinishPayload: jest.fn(),
  createPaymentPayload: jest.fn(),
  getPayloadStatus: jest.fn(),
}));

jest.mock('xrpl', () => ({
  Wallet: {
    fromSeed: jest.fn(() => ({
      classicAddress: 'rSignerTestAddr',
    })),
  },
}));

jest.mock('@/config/constants', () => ({
  PLATFORM: { FEE_PERCENT: 0.98 },
  RLUSD_ISSUER: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3',
  RLUSD_CURRENCY: 'RLUSD',
  MCC_TAXONS: { WORK_CREDENTIAL: 1, CLIENT_COMPLETION: 4 },
}));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/contracts/[id]/milestones/[seq]/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePatch(body: Record<string, any>): NextRequest {
  return new NextRequest(
    new URL('http://localhost:3000/api/contracts/contract-1/milestones/1'),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

const params = { id: 'contract-1-uuid', seq: '1' };

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

// ─── Test Data ────────────────────────────────────────────────────────────────

function makeContract(milestoneOverrides: Record<string, any> = {}, contractOverrides: Record<string, any> = {}) {
  return {
    id: 'contract-1-uuid',
    creator_id: 'user-cr1-uuid',
    marketplace_id: 'user-mk1-uuid',
    template: 'fixed_price',
    title: 'Test Project',
    status: 'active',
    currency: 'RLUSD',
    milestones: [{
      id: 'ms-1-uuid',
      sequence: 1,
      title: 'Design mockups',
      amount: 500,
      status: 'pending',
      condition: 'COND_HEX',
      fulfillment: 'FULFILL_HEX',
      escrow_tx_hash: null,
      escrow_sequence: null,
      deliverable_hash: null,
      deliverable_notes: null,
      deliverable_media_url: null,
      deliverable_doc_url: null,
      ...milestoneOverrides,
    }],
    ...contractOverrides,
  };
}

// ─── SUBMIT Tests ─────────────────────────────────────────────────────────────

describe('PATCH milestone: submit action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('returns 400 for invalid action', async () => {
    const res = await PATCH(
      makePatch({ action: 'invalid_action' }),
      { params }
    );
    const { status } = await parseRes(res);
    expect(status).toBe(400);
  });

  it('returns 403 if marketplace tries to submit', async () => {
    activeSession = marketplaceSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'funded' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'submit' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(403);
    expect(body.error).toContain('Only the creator');
  });

  it('returns 400 if milestone is not funded', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'pending' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'submit' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('expected funded');
  });

  it('successfully submits work with deliverable info', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        return mockQueryBuilder({
          data: makeContract({ status: 'funded' }, { status: 'funded' }),
          error: null,
        });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await PATCH(
      makePatch({
        action: 'submit',
        deliverableHash: 'SHA256_HASH_OF_WORK',
        deliverableNotes: 'Three logo concepts attached',
        deliverableMediaUrl: 'https://example.com/preview.png',
      }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('submitted');
    expect(body.milestone.status).toBe('submitted');
  });

  it('advances contract from funded to active on first submission', async () => {
    const contractUpdates: any[] = [];

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: null, error: null });
          if (prop === 'single') {
            if (table === 'contracts') {
              return jest.fn().mockResolvedValue({
                data: makeContract({ status: 'funded' }, { status: 'funded' }),
                error: null,
              });
            }
            return jest.fn().mockResolvedValue({ data: null, error: null });
          }
          if (prop === 'update' && table === 'contracts') {
            return jest.fn().mockImplementation((data: any) => {
              contractUpdates.push(data);
              return chain;
            });
          }
          return jest.fn().mockReturnValue(chain);
        },
      });
      return chain;
    });

    const res = await PATCH(
      makePatch({ action: 'submit' }),
      { params }
    );
    const { status } = await parseRes(res);

    expect(status).toBe(200);
    // Contract should be updated to 'active'
    expect(contractUpdates).toContainEqual({ status: 'active' });
  });
});

// ─── APPROVE Tests ────────────────────────────────────────────────────────────

describe('PATCH milestone: approve action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = marketplaceSession;
  });

  it('returns 403 if creator tries to approve', async () => {
    activeSession = creatorSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'submitted' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'approve' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(403);
    expect(body.error).toContain('Only the marketplace');
  });

  it('returns 400 if milestone is not submitted', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'funded' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'approve' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('expected submitted');
  });

  it('successfully approves submitted work', async () => {
    mockFrom.mockImplementation(() =>
      mockQueryBuilder({
        data: makeContract({ status: 'submitted' }),
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'approve' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('approved');
    expect(body.milestone.status).toBe('approved');
  });
});

// ─── REQUEST CHANGES Tests ────────────────────────────────────────────────────

describe('PATCH milestone: request_changes action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = marketplaceSession;
  });

  it('returns 403 if creator tries to request changes', async () => {
    activeSession = creatorSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'submitted' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'request_changes' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(403);
    expect(body.error).toContain('Only the marketplace');
  });

  it('returns 400 if milestone is not submitted', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'approved' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'request_changes' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('expected submitted');
  });

  it('reverts milestone to funded and clears deliverables', async () => {
    const milestoneUpdates: any[] = [];

    mockFrom.mockImplementation((table: string) => {
      const chain: any = new Proxy({}, {
        get: (_target, prop) => {
          if (prop === 'then') return (resolve: Function) => resolve({ data: null, error: null });
          if (prop === 'single') {
            return jest.fn().mockResolvedValue({
              data: makeContract({ status: 'submitted' }),
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

    const res = await PATCH(makePatch({ action: 'request_changes' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.milestone.status).toBe('funded');
    expect(body.milestone.submitted_at).toBeNull();

    // Verify deliverable fields were cleared
    const msUpdate = milestoneUpdates[0];
    expect(msUpdate).toBeDefined();
    expect(msUpdate.status).toBe('funded');
    expect(msUpdate.deliverable_hash).toBeNull();
    expect(msUpdate.deliverable_notes).toBeNull();
    expect(msUpdate.deliverable_media_url).toBeNull();
    expect(msUpdate.deliverable_doc_url).toBeNull();
  });
});

// ─── RELEASE Tests ────────────────────────────────────────────────────────────

describe('PATCH milestone: release action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = marketplaceSession;
  });

  it('returns 403 if creator tries to release', async () => {
    activeSession = creatorSession;

    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'approved' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'release' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(403);
    expect(body.error).toContain('Only the marketplace');
  });

  it('returns 400 if milestone is not approved', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({ data: makeContract({ status: 'submitted' }), error: null })
    );

    const res = await PATCH(makePatch({ action: 'release' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('expected approved');
  });

  it('returns 400 if no XRPL transaction confirmed (no walletSeed or xamanPayloadUuid)', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: makeContract({
          status: 'approved',
          escrow_sequence: 42,
        }),
        error: null,
      })
    );

    const res = await PATCH(makePatch({ action: 'release' }), { params });
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('No XRPL release transaction');
  });
});

// ─── DISPUTE Tests ────────────────────────────────────────────────────────────

describe('PATCH milestone: dispute action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSession = creatorSession;
  });

  it('allows creator to dispute a funded milestone', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'disputes') {
        return mockQueryBuilder({ data: { id: 'dispute-1-uuid' }, error: null });
      }
      return mockQueryBuilder({
        data: makeContract({ status: 'funded' }),
        error: null,
      });
    });

    const res = await PATCH(
      makePatch({ action: 'dispute', reason: 'Scope disagreement' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('Dispute opened');
    expect(body.disputeId).toBeDefined();
  });

  it('allows marketplace to dispute a submitted milestone', async () => {
    activeSession = marketplaceSession;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'disputes') {
        return mockQueryBuilder({ data: { id: 'dispute-2-uuid' }, error: null });
      }
      return mockQueryBuilder({
        data: makeContract({ status: 'submitted' }),
        error: null,
      });
    });

    const res = await PATCH(
      makePatch({ action: 'dispute', reason: 'Quality not acceptable' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(200);
    expect(body.message).toContain('Dispute opened');
  });

  it('returns 400 if milestone is pending (not yet funded)', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: makeContract({ status: 'pending' }),
        error: null,
      })
    );

    const res = await PATCH(
      makePatch({ action: 'dispute', reason: 'Nothing to dispute yet' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('Cannot dispute');
  });

  it('returns 400 if milestone is already released', async () => {
    mockFrom.mockReturnValue(
      mockQueryBuilder({
        data: makeContract({ status: 'released' }),
        error: null,
      })
    );

    const res = await PATCH(
      makePatch({ action: 'dispute' }),
      { params }
    );
    const { status, body } = await parseRes(res);

    expect(status).toBe(400);
    expect(body.error).toContain('Cannot dispute');
  });

  it('fires n8n dispute event with correct payload', async () => {
    const { n8n } = require('@/lib/n8n');

    mockFrom.mockImplementation((table: string) => {
      if (table === 'disputes') {
        return mockQueryBuilder({ data: { id: 'dispute-3-uuid' }, error: null });
      }
      return mockQueryBuilder({
        data: makeContract({ status: 'funded' }),
        error: null,
      });
    });

    await PATCH(
      makePatch({ action: 'dispute', reason: 'Late delivery' }),
      { params }
    );

    expect(n8n.disputeOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1-uuid',
        milestoneId: 'ms-1-uuid',
        disputeId: 'dispute-3-uuid',
        raisedBy: creatorSession.user.id,
      })
    );
  });
});

// ─── Role Authorization Matrix ────────────────────────────────────────────────

describe('Role authorization matrix', () => {
  it.each([
    ['submit', 'creator', 'funded', 200],
    ['submit', 'marketplace', 'funded', 403],
    ['approve', 'marketplace', 'submitted', 200],
    ['approve', 'creator', 'submitted', 403],
    ['request_changes', 'marketplace', 'submitted', 200],
    ['request_changes', 'creator', 'submitted', 403],
    ['release', 'marketplace', 'approved', 400], // 400 because no XRPL tx, but auth passes
    ['release', 'creator', 'approved', 403],
    ['dispute', 'creator', 'funded', 200],
    ['dispute', 'marketplace', 'funded', 200],
  ])('%s by %s on %s milestone → %i', async (action, role, msStatus, expectedStatus) => {
    activeSession = role === 'creator' ? creatorSession : marketplaceSession;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'disputes') {
        return mockQueryBuilder({ data: { id: 'dispute-uuid' }, error: null });
      }
      return mockQueryBuilder({
        data: makeContract({ status: msStatus }),
        error: null,
      });
    });

    const res = await PATCH(makePatch({ action }), { params });
    const { status } = await parseRes(res);

    expect(status).toBe(expectedStatus);
  });
});
