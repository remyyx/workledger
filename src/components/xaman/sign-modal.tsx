'use client';

// ============================================
// Xaman Sign Modal
// ============================================
// Shows a QR code + deep link for the user to sign
// transactions in their Xaman wallet app.
//
// Features:
// - QR code for desktop (scan with phone)
// - Deep link button for mobile (opens Xaman directly)
// - Real-time countdown timer
// - Status indicators (pending, signed, rejected, expired)
// - Auto-closes on success

import { useEffect, useState } from 'react';
import { X, Smartphone, QrCode, Check, AlertCircle, Clock, Loader2 } from 'lucide-react';
import type { XamanSignStatus } from '@/hooks/use-xaman-sign';

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: XamanSignStatus;
  qrUrl: string | null;
  deeplink: string | null;
  error: string | null;
  expiresIn: number | null;
  instruction?: string;
  // Auto-close after success (ms)
  autoCloseDelay?: number;
}

export function XamanSignModal({
  isOpen,
  onClose,
  status,
  qrUrl,
  deeplink,
  error,
  expiresIn,
  instruction,
  autoCloseDelay = 2000,
}: SignModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for deep link vs QR
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Auto-close on success
  useEffect(() => {
    if (status === 'success' && autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={status === 'pending' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-brand-400" />
            </div>
            <h3 className="font-semibold text-white">Sign with Xaman</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-alt text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Creating state */}
          {status === 'creating' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-gray-400 text-sm">Preparing sign request...</p>
            </div>
          )}

          {/* Pending — show QR or deep link */}
          {status === 'pending' && (
            <div className="flex flex-col items-center gap-4">
              {instruction && (
                <p className="text-gray-300 text-sm text-center">{instruction}</p>
              )}

              {/* QR Code for desktop */}
              {!isMobile && qrUrl && (
                <div className="bg-white rounded-xl p-3">
                  <img
                    src={qrUrl}
                    alt="Scan with Xaman"
                    className="w-48 h-48"
                  />
                </div>
              )}

              {/* Deep link for mobile */}
              {isMobile && deeplink && (
                <a
                  href={deeplink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
                >
                  <Smartphone className="w-5 h-5" />
                  Open in Xaman
                </a>
              )}

              {/* Desktop also gets deep link as fallback */}
              {!isMobile && deeplink && (
                <a
                  href={deeplink}
                  className="text-brand-400 hover:text-brand-300 text-sm underline transition-colors"
                >
                  Or open Xaman app directly
                </a>
              )}

              {/* QR icon hint for desktop */}
              {!isMobile && (
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>Scan with your Xaman app</span>
                </div>
              )}

              {/* Countdown */}
              {expiresIn !== null && expiresIn > 0 && (
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Signed — verifying */}
          {status === 'signed' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-gray-300 text-sm">Verifying transaction...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Transaction signed</p>
                <p className="text-gray-400 text-sm mt-1">Confirmed on XRPL</p>
              </div>
            </div>
          )}

          {/* Rejected */}
          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <X className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Request declined</p>
                <p className="text-gray-400 text-sm mt-1">You cancelled the sign request in Xaman.</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-gray-300 hover:bg-surface-alt text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Request expired</p>
                <p className="text-gray-400 text-sm mt-1">The sign request timed out. Please try again.</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-gray-300 hover:bg-surface-alt text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Something went wrong</p>
                {error && (
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-gray-300 hover:bg-surface-alt text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer — Xaman branding */}
        <div className="px-4 py-3 bg-surface-alt/50 border-t border-border">
          <p className="text-center text-xs text-gray-600">
            Powered by Xaman — your keys, your wallet
          </p>
        </div>
      </div>
    </div>
  );
}
