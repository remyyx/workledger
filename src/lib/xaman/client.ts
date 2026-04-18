// ============================================
// Xaman SDK Client — Server-Side Only
// ============================================
// This wraps the xumm-sdk for use in Next.js API routes.
// NEVER import this file from client-side code.
//
// Why server-side only?
// - The API Secret must never reach the browser
// - Payload creation is an authenticated API call
// - Status verification should happen server-side for security
//
// The flow:
// 1. Frontend calls our API route → this creates a Xaman payload
// 2. Frontend shows QR code / deep link from the payload
// 3. User signs in Xaman app (phone)
// 4. Frontend listens via WebSocket (client-side, no secret needed)
// 5. Frontend calls our API route to verify → this checks payload status

import { XummSdk } from 'xumm-sdk';
import type { XamanPayloadCreated, XamanPayloadStatus, XamanSignRequest } from './types';

let sdkInstance: XummSdk | null = null;

/**
 * Get the singleton Xaman SDK instance.
 * Lazy-initialized on first call.
 */
function getXamanSdk(): XummSdk {
  if (sdkInstance) return sdkInstance;

  const apiKey = process.env.XAMAN_API_KEY;
  const apiSecret = process.env.XAMAN_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Xaman SDK not configured. Set XAMAN_API_KEY and XAMAN_API_SECRET in your environment.'
    );
  }

  sdkInstance = new XummSdk(apiKey, apiSecret);
  return sdkInstance;
}

/**
 * Create a sign payload.
 * Returns a UUID + QR code + WebSocket URL for the frontend.
 *
 * The txjson is a transaction template — Xaman fills in:
 * - Account (from the user's wallet)
 * - Fee (calculated by XRPL)
 * - Sequence (current account sequence)
 *
 * So we just provide the transaction-specific fields.
 */
export async function createPayload(
  request: XamanSignRequest
): Promise<XamanPayloadCreated> {
  const sdk = getXamanSdk();

  const payload = await sdk.payload?.create({
    txjson: request.txjson,
    options: request.options,
    custom_meta: request.custom_meta,
  } as any);

  if (!payload) {
    throw new Error('Failed to create Xaman payload.');
  }

  return {
    uuid: payload.uuid,
    next: {
      always: payload.next.always,
      no_push_msg_received: payload.next.no_push_msg_received,
    },
    refs: {
      qr_png: payload.refs.qr_png,
      qr_matrix: payload.refs.qr_matrix,
      qr_uri_quality_opts: payload.refs.qr_uri_quality_opts,
      websocket_status: payload.refs.websocket_status,
    },
    pushed: payload.pushed,
  };
}

/**
 * Get the status of a payload (after user signs or rejects).
 * Call this after the WebSocket tells us signed=true.
 *
 * Returns the full signed transaction details including:
 * - XRPL transaction hash (txid)
 * - Signer address (account)
 * - Signed transaction blob (hex)
 */
export async function getPayloadStatus(
  uuid: string
): Promise<XamanPayloadStatus> {
  const sdk = getXamanSdk();

  const result = await sdk.payload?.get(uuid);

  if (!result) {
    throw new Error(`Payload ${uuid} not found.`);
  }

  // Cast to access properties safely — SDK types don't expose everything
  const meta = result.meta as Record<string, any>;
  const payload = result.payload as Record<string, any>;
  const response = result.response as Record<string, any> | undefined;

  return {
    uuid: (result as any).uuid ?? uuid,
    resolved: meta.resolved,
    signed: meta.signed,
    cancelled: meta.cancelled,
    expired: meta.expired,
    txid: response?.txid || undefined,
    account: response?.account || undefined,
    payload: {
      tx_type: payload.tx_type,
      tx_destination: payload.tx_destination || undefined,
      tx_destination_tag: payload.tx_destination_tag || undefined,
      created_at: payload.created_at,
      expires_at: payload.expires_at,
      resolved_at: meta.resolved_at || undefined,
    },
    response: response?.hex
      ? {
          hex: response.hex,
          txid: response.txid || '',
          account: response.account || '',
          signer: response.signer || response.account || '',
          dispatched_result: response.dispatched_result || undefined,
        }
      : undefined,
  };
}

/**
 * Cancel a pending payload.
 * Use this to clean up if the user navigates away without signing.
 */
export async function cancelPayload(uuid: string): Promise<boolean> {
  const sdk = getXamanSdk();

  try {
    const result = await sdk.payload?.cancel(uuid);
    return (result as any)?.cancelled ?? false;
  } catch {
    return false;
  }
}

/**
 * Create a SignIn payload for authentication.
 * This is a special transaction type that doesn't create an on-chain tx.
 * It just proves the user owns a specific XRPL address.
 */
export async function createSignInPayload(options?: {
  returnUrl?: string;
  instruction?: string;
}): Promise<XamanPayloadCreated> {
  return createPayload({
    txjson: {
      TransactionType: 'SignIn',
    },
    options: {
      submit: false, // SignIn doesn't submit to XRPL
      return_url: options?.returnUrl
        ? { web: options.returnUrl }
        : undefined,
    },
    custom_meta: {
      identifier: 'workledger-auth',
      instruction: options?.instruction || 'Sign in to WorkLedger',
    },
  });
}

/**
 * Create an EscrowCreate payload for the user to sign.
 * We prepare the transaction template, Xaman fills in Account + Fee + Sequence.
 */
export async function createEscrowPayload(params: {
  destination: string;
  amount: string;
  currency: string;
  issuer: string;
  condition: string;
  cancelAfter: number;     // Ripple epoch timestamp
  finishAfter?: number;    // Ripple epoch timestamp
  contractId?: string;
  milestoneSequence?: number;
  instruction?: string;
}): Promise<XamanPayloadCreated> {
  const txjson: Record<string, any> = {
    TransactionType: 'EscrowCreate',
    Destination: params.destination,
    Amount: {
      currency: params.currency,
      issuer: params.issuer,
      value: params.amount,
    },
    Condition: params.condition,
    CancelAfter: params.cancelAfter,
  };

  if (params.finishAfter) {
    txjson.FinishAfter = params.finishAfter;
  }

  return createPayload({
    txjson,
    custom_meta: {
      identifier: params.contractId
        ? `escrow-create:${params.contractId}:${params.milestoneSequence ?? 0}`
        : 'escrow-create',
      instruction:
        params.instruction ||
        `Fund escrow: ${params.amount} ${params.currency}`,
    },
  });
}

/**
 * Create an EscrowFinish payload for the user to sign.
 */
export async function createEscrowFinishPayload(params: {
  escrowOwner: string;
  escrowSequence: number;
  condition: string;
  fulfillment: string;
  contractId?: string;
  instruction?: string;
}): Promise<XamanPayloadCreated> {
  return createPayload({
    txjson: {
      TransactionType: 'EscrowFinish',
      Owner: params.escrowOwner,
      OfferSequence: params.escrowSequence,
      Condition: params.condition,
      Fulfillment: params.fulfillment,
    },
    custom_meta: {
      identifier: params.contractId
        ? `escrow-finish:${params.contractId}`
        : 'escrow-finish',
      instruction: params.instruction || 'Release escrow funds',
    },
  });
}

/**
 * Create a Payment payload (used for platform fees).
 */
export async function createPaymentPayload(params: {
  destination: string;
  amount: string;
  currency: string;
  issuer: string;
  instruction?: string;
}): Promise<XamanPayloadCreated> {
  return createPayload({
    txjson: {
      TransactionType: 'Payment',
      Destination: params.destination,
      Amount: {
        currency: params.currency,
        issuer: params.issuer,
        value: params.amount,
      },
    },
    custom_meta: {
      instruction: params.instruction || `Payment: ${params.amount} ${params.currency}`,
    },
  });
}

/**
 * Create a TrustSet payload for setting up trust lines.
 */
export async function createTrustLinePayload(params: {
  currency: string;
  issuer: string;
  limit: string;
  instruction?: string;
}): Promise<XamanPayloadCreated> {
  return createPayload({
    txjson: {
      TransactionType: 'TrustSet',
      LimitAmount: {
        currency: params.currency,
        issuer: params.issuer,
        value: params.limit,
      },
    },
    custom_meta: {
      instruction: params.instruction || `Trust line: ${params.currency}`,
    },
  });
}
