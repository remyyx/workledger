// ============================================
// Xaman Types
// ============================================
// Type definitions for Xaman (formerly XUMM) integration.
// These mirror the SDK responses but keep us decoupled.

export interface XamanPayloadCreated {
  uuid: string;
  next: {
    always: string;    // Universal link (works on mobile + desktop)
    no_push_msg_received?: string;
  };
  refs: {
    qr_png: string;           // QR code image URL
    qr_matrix: string;        // QR matrix data URL
    qr_uri_quality_opts: string[];
    websocket_status: string;  // WebSocket URL for real-time status
  };
  pushed: boolean;  // Whether push notification was sent to user
}

export interface XamanPayloadStatus {
  uuid: string;
  resolved: boolean;
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  // Set when signed
  txid?: string;              // XRPL transaction hash
  account?: string;           // Signer's XRPL address
  // Payload details
  payload: {
    tx_type: string;
    tx_destination?: string;
    tx_destination_tag?: number;
    created_at: string;
    expires_at: string;
    resolved_at?: string;
  };
  response?: {
    hex: string;              // Signed transaction blob
    txid: string;             // XRPL tx hash
    account: string;          // Signer address
    signer: string;           // Signer address (same as account for single-sign)
    dispatched_result?: string;
  };
}

export type XamanTransactionType =
  | 'SignIn'           // Authentication only (no on-chain tx)
  | 'EscrowCreate'     // Lock funds in escrow
  | 'EscrowFinish'     // Release escrow
  | 'EscrowCancel'     // Cancel escrow (refund)
  | 'Payment'          // Direct payment (fees, etc.)
  | 'TrustSet'         // Set trust line
  | 'NFTokenMint'      // Mint MCC copyright token (XRPL protocol name)
  | 'NFTokenCreateOffer'; // Create MCC sell offer (XRPL protocol name)

export interface XamanSignRequest {
  // The XRPL transaction template — Xaman fills in Account, Fee, Sequence
  txjson: Record<string, any>;
  // Optional metadata shown to user in Xaman app
  options?: {
    submit?: boolean;         // Auto-submit to XRPL after signing (default: true)
    return_url?: {
      app?: string;           // Deep link back to our app
      web?: string;           // Redirect URL for web
    };
    expire?: number;          // Seconds until payload expires (default: ~300)
  };
  // Custom metadata (stored with payload, not sent to XRPL)
  custom_meta?: {
    identifier?: string;      // Our internal reference (e.g., contract ID)
    blob?: Record<string, any>; // Extra data
    instruction?: string;     // Human-readable instruction shown in Xaman
  };
}

// WebSocket event types from Xaman
export interface XamanWebSocketEvent {
  // Connection confirmation
  message?: string;
  // Countdown
  expires_in_seconds?: number;
  // Final status
  signed?: boolean;
  // Payload UUID reference
  payload_uuidv4?: string;
}
