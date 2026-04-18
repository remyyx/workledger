/**
 * API Route Test Utilities
 *
 * Provides mock factories for Supabase, auth sessions, and test data
 * so API route handlers can be tested without a real database.
 *
 * Pattern:
 *   1. Mock getSessionOrDev() to return a controlled session + supabase client
 *   2. Mock the supabase client's chainable query builder
 *   3. Call the route handler with a crafted NextRequest
 *   4. Assert on the NextResponse JSON
 */

import { NextRequest } from 'next/server';

// ─── Test Data Factories ──────────────────────────────────────────────────────

export const TEST_USERS = {
  creator1: {
    id: 'user-cr1-uuid',
    email: 'creator1@test.studioledger.local',
    role: 'creator',
    display_name: 'Creator 1 (virtual tester)',
    xrpl_address: 'rCreator1TestAddr',
  },
  marketplace1: {
    id: 'user-mk1-uuid',
    email: 'marketplace1@test.studioledger.local',
    role: 'marketplace',
    display_name: 'Marketplace 1 (virtual tester)',
    xrpl_address: 'rMarketplace1TestAddr',
  },
} as const;

let milestoneIdCounter = 0;
export function createTestMilestone(overrides: Record<string, any> = {}) {
  milestoneIdCounter++;
  return {
    id: overrides.id || `ms-${milestoneIdCounter}-uuid`,
    contract_id: overrides.contract_id || 'contract-1-uuid',
    sequence: overrides.sequence ?? milestoneIdCounter,
    title: overrides.title || `Milestone ${milestoneIdCounter}`,
    description: overrides.description || '',
    amount: overrides.amount ?? 500,
    status: overrides.status || 'pending',
    condition: overrides.condition || 'COND_HEX_PLACEHOLDER',
    fulfillment: overrides.fulfillment || 'FULFILL_HEX_PLACEHOLDER',
    deadline: overrides.deadline || null,
    escrow_tx_hash: overrides.escrow_tx_hash || null,
    escrow_sequence: overrides.escrow_sequence || null,
    deliverable_hash: overrides.deliverable_hash || null,
    deliverable_notes: overrides.deliverable_notes || null,
    deliverable_media_url: overrides.deliverable_media_url || null,
    deliverable_doc_url: overrides.deliverable_doc_url || null,
    submitted_at: overrides.submitted_at || null,
    approved_at: overrides.approved_at || null,
    released_at: overrides.released_at || null,
    ...overrides,
  };
}

export function createTestContract(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || 'contract-1-uuid',
    creator_id: overrides.creator_id || TEST_USERS.creator1.id,
    marketplace_id: overrides.marketplace_id || TEST_USERS.marketplace1.id,
    template: overrides.template || 'fixed_price',
    title: overrides.title || 'Test Contract',
    description: overrides.description || 'A test contract',
    status: overrides.status || 'draft',
    currency: overrides.currency || 'RLUSD',
    total_amount: overrides.total_amount ?? 1000,
    platform_fee: overrides.platform_fee || '9.800000',
    license_terms: overrides.license_terms || null,
    metadata: overrides.metadata || { marketplace_email: TEST_USERS.marketplace1.email },
    milestones: overrides.milestones || [],
    ...overrides,
  };
}

// ─── Mock Supabase Query Builder ──────────────────────────────────────────────

/**
 * Creates a chainable mock that mimics Supabase's query builder pattern.
 * Each method returns the same builder (chainable), and the final
 * `single()` / terminal call resolves with the configured data.
 *
 * Usage:
 *   const mockFrom = createMockQueryBuilder({ data: someRow, error: null });
 *   mockSupabase.from.mockReturnValue(mockFrom);
 */
export function createMockQueryBuilder(result: { data: any; error: any; count?: number }) {
  const builder: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in',
    'or', 'and', 'not', 'is', 'filter',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'textSearch', 'match', 'contains', 'containedBy',
    'overlaps', 'like', 'ilike',
  ];

  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // Terminal methods resolve with the configured result
  builder.single = jest.fn().mockResolvedValue(result);
  builder.then = (resolve: Function) => resolve(result);

  // Make the builder itself act as a promise (for queries without .single())
  builder[Symbol.toStringTag] = 'Promise';

  return builder;
}

/**
 * Creates a mock Supabase client with a configurable `from()` method.
 * Override responses per-table using the responseMap.
 *
 * Usage:
 *   const supabase = createMockSupabase({
 *     contracts: { data: myContract, error: null },
 *     milestones: { data: [milestone1], error: null },
 *   });
 */
export function createMockSupabase(responseMap: Record<string, { data: any; error: any }> = {}) {
  const defaultResponse = { data: null, error: null };

  const mockFrom = jest.fn((table: string) => {
    const response = responseMap[table] || defaultResponse;
    return createMockQueryBuilder(response);
  });

  return {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

// ─── Mock Session ─────────────────────────────────────────────────────────────

export function createMockSession(user: typeof TEST_USERS.creator1 | typeof TEST_USERS.marketplace1) {
  return {
    user: { id: user.id, email: user.email },
  };
}

// ─── Request Helpers ──────────────────────────────────────────────────────────

/**
 * Create a NextRequest for testing API routes.
 */
export function createTestRequest(
  method: string,
  url: string,
  body?: Record<string, any>,
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

/**
 * Extract JSON from a NextResponse for assertions.
 */
export async function parseResponse(response: Response): Promise<{ status: number; body: any }> {
  const body = await response.json();
  return { status: response.status, body };
}

// ─── Reset Helper ─────────────────────────────────────────────────────────────

export function resetMilestoneCounter() {
  milestoneIdCounter = 0;
}
