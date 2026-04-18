'use client';

// ============================================
// Receive Modal — Display XRPL address + QR
// ============================================
// Shows user's XRPL address as a QR code for
// receiving payments. Includes copy-to-clipboard.

import { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

// Simple QR code using a free API (no extra dependency)
function QRCode({ value, size = 200 }: { value: string; size?: number }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=FFFFFF&color=1A1A2E&margin=8`;
  return (
    <img
      src={qrUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-xl"
    />
  );
}

export function ReceiveModal({ isOpen, onClose, address }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!isOpen || !address) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="font-semibold text-white">Receive Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-alt text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          <p className="text-gray-400 text-sm text-center">
            Share this address or QR code to receive XRPL payments
          </p>

          {/* QR Code */}
          <div className="bg-white rounded-xl p-3 shadow-lg">
            <QRCode value={address} size={200} />
          </div>

          {/* Address */}
          <div className="w-full">
            <p className="text-xs text-gray-500 mb-1.5 text-center">Your XRPL Address</p>
            <div className="flex items-center gap-2 bg-surface-alt rounded-lg p-3">
              <code className="flex-1 text-sm text-gray-300 break-all font-mono">
                {address}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 p-2 rounded-lg hover:bg-surface text-gray-400 hover:text-white transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-400 text-center mt-1.5">
                Address copied!
              </p>
            )}
          </div>

          <p className="text-xs text-gray-600 text-center">
            Only send XRPL-compatible assets to this address
          </p>
        </div>
      </div>
    </div>
  );
}
