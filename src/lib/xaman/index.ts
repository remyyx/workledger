// ============================================
// Xaman Module — Public API
// ============================================
// Server-side only — never import from client components.
//
// For client-side Xaman interaction, use the React hook:
//   import { useXamanSign } from '@/hooks/use-xaman-sign';

export {
  createPayload,
  getPayloadStatus,
  cancelPayload,
  createSignInPayload,
  createEscrowPayload,
  createEscrowFinishPayload,
  createPaymentPayload,
  createTrustLinePayload,
} from './client';

export type {
  XamanPayloadCreated,
  XamanPayloadStatus,
  XamanSignRequest,
  XamanTransactionType,
  XamanWebSocketEvent,
} from './types';
