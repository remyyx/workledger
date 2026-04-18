'use client';

// ============================================
// useXamanSign — React Hook for Xaman Signing
// ============================================
// Manages the full Xaman sign lifecycle:
// 1. Request a payload from our API
// 2. Show QR code / deep link to user
// 3. Listen for sign/reject via WebSocket
// 4. Verify the signed payload
// 5. Return the transaction result
//
// Usage:
//   const { requestSign, status, qrUrl, deeplink, reset } = useXamanSign();
//   await requestSign({ TransactionType: 'EscrowCreate', ... });

import { useState, useCallback, useRef, useEffect } from 'react';

export type XamanSignStatus =
  | 'idle'          // No active sign request
  | 'creating'      // Creating payload via API
  | 'pending'       // Waiting for user to scan QR / tap deeplink
  | 'signed'        // User signed — verifying with backend
  | 'success'       // Transaction confirmed
  | 'rejected'      // User rejected in Xaman
  | 'expired'       // Payload timed out
  | 'error';        // Something went wrong

export interface XamanSignResult {
  txid: string;         // XRPL transaction hash
  account: string;      // Signer's XRPL address
  signed_blob?: string; // Raw signed transaction hex
}

export interface UseXamanSignReturn {
  // Actions
  requestSign: (txjson: Record<string, any>, meta?: {
    identifier?: string;
    instruction?: string;
  }) => Promise<XamanSignResult | null>;
  reset: () => void;
  cancel: () => Promise<void>;

  // State
  status: XamanSignStatus;
  qrUrl: string | null;
  deeplink: string | null;
  error: string | null;
  expiresIn: number | null; // Seconds until payload expires
  result: XamanSignResult | null;
}

export function useXamanSign(): UseXamanSignReturn {
  const [status, setStatus] = useState<XamanSignStatus>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [result, setResult] = useState<XamanSignResult | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const payloadUuidRef = useRef<string | null>(null);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    payloadUuidRef.current = null;
    setStatus('idle');
    setQrUrl(null);
    setDeeplink(null);
    setError(null);
    setExpiresIn(null);
    setResult(null);
  }, []);

  const cancel = useCallback(async () => {
    if (payloadUuidRef.current) {
      try {
        await fetch(`/api/xaman/payload/${payloadUuidRef.current}`, {
          method: 'DELETE',
        });
      } catch {
        // Best-effort cancel
      }
    }
    reset();
  }, [reset]);

  const requestSign = useCallback(
    async (
      txjson: Record<string, any>,
      meta?: { identifier?: string; instruction?: string }
    ): Promise<XamanSignResult | null> => {
      // Reset any previous state
      reset();
      setStatus('creating');

      try {
        // 1. Create payload via our API
        const response = await fetch('/api/xaman/payload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txjson,
            custom_meta: meta
              ? {
                  identifier: meta.identifier,
                  instruction: meta.instruction,
                }
              : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create sign request.');
        }

        const payload = await response.json();
        payloadUuidRef.current = payload.uuid;
        setQrUrl(payload.qr_png);
        setDeeplink(payload.deeplink);
        setStatus('pending');

        // 2. Listen for sign/reject via WebSocket
        return new Promise<XamanSignResult | null>((resolve) => {
          const ws = new WebSocket(payload.websocket);
          wsRef.current = ws;

          ws.onmessage = async (event) => {
            try {
              const data = JSON.parse(event.data);

              // Countdown updates
              if (data.expires_in_seconds !== undefined) {
                setExpiresIn(data.expires_in_seconds);
              }

              // Final status — signed or rejected
              if (data.signed !== undefined) {
                ws.close();
                wsRef.current = null;

                if (data.signed === true) {
                  setStatus('signed');

                  // 3. Verify with our backend
                  try {
                    const verifyRes = await fetch(
                      `/api/xaman/payload/${payload.uuid}`
                    );
                    const verifyData = await verifyRes.json();

                    if (verifyData.signed && verifyData.txid) {
                      const signResult: XamanSignResult = {
                        txid: verifyData.txid,
                        account: verifyData.account,
                        signed_blob: verifyData.signed_blob,
                      };
                      setResult(signResult);
                      setStatus('success');
                      resolve(signResult);
                    } else {
                      setError('Transaction verification failed.');
                      setStatus('error');
                      resolve(null);
                    }
                  } catch (err: any) {
                    setError(err.message || 'Verification failed.');
                    setStatus('error');
                    resolve(null);
                  }
                } else {
                  // User rejected
                  setStatus('rejected');
                  resolve(null);
                }
              }

              // Payload expired
              if (data.expired) {
                ws.close();
                wsRef.current = null;
                setStatus('expired');
                resolve(null);
              }
            } catch {
              // Ignore malformed WebSocket messages
            }
          };

          ws.onerror = () => {
            setError('WebSocket connection failed. Please try again.');
            setStatus('error');
            resolve(null);
          };

          ws.onclose = () => {
            // If we haven't resolved yet, the connection dropped
            if (status === 'pending') {
              setError('Connection lost. Please try again.');
              setStatus('error');
              resolve(null);
            }
          };
        });
      } catch (err: any) {
        setError(err.message || 'Failed to create sign request.');
        setStatus('error');
        return null;
      }
    },
    [reset, status]
  );

  return {
    requestSign,
    reset,
    cancel,
    status,
    qrUrl,
    deeplink,
    error,
    expiresIn,
    result,
  };
}
