'use client';

// ============================================
// Send Payment Modal
// ============================================
// Form to send XRPL payments via Xaman signing.
// Validates address, amount, and currency before
// creating a Xaman payload for the user to sign.

import { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useXamanSign } from '@/hooks';
import { XamanSignModal } from '@/components/xaman/sign-modal';
import { CURRENCIES } from '@/config/constants';
import type { WalletBalance } from '@/types';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: WalletBalance[];
  onSuccess?: () => void;
}

export function SendModal({ isOpen, onClose, balances, onSuccess }: SendModalProps) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('XRP');
  const [formError, setFormError] = useState<string | null>(null);
  const [showXaman, setShowXaman] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const xaman = useXamanSign();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDestination('');
      setAmount('');
      setCurrency('XRP');
      setFormError(null);
      setShowXaman(false);
      setSendSuccess(false);
      xaman.reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // Get available currencies from user's balances
  const availableCurrencies = (balances || [])
    .filter((b) => parseFloat(b.value) > 0)
    .map((b) => {
      const info = CURRENCIES.find((c) => c.code === b.currency);
      return { code: b.currency, icon: info?.icon || '🪙', balance: b.display_value };
    });

  // If user has no balances with value, show all configured currencies
  const currencyOptions = availableCurrencies.length > 0
    ? availableCurrencies
    : CURRENCIES.map((c) => ({ code: c.code, icon: c.icon, balance: '0' }));

  const selectedBalance = (balances || []).find((b) => b.currency === currency);

  // Basic XRPL address validation
  const isValidAddress = (addr: string) => {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate
    if (!destination.trim()) {
      setFormError('Enter a destination address');
      return;
    }
    if (!isValidAddress(destination.trim())) {
      setFormError('Invalid XRPL address. Must start with "r".');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Enter a valid amount greater than 0');
      return;
    }
    if (selectedBalance && numAmount > parseFloat(selectedBalance.value)) {
      setFormError(`Insufficient balance. You have ${selectedBalance.display_value} ${currency}`);
      return;
    }

    // Build payment transaction
    const txjson: Record<string, any> = {
      TransactionType: 'Payment',
      Destination: destination.trim(),
    };

    if (currency === 'XRP') {
      // XRP uses drops (1 XRP = 1,000,000 drops)
      txjson.Amount = String(Math.floor(numAmount * 1_000_000));
    } else {
      // Issued currencies use amount object
      const balanceEntry = (balances || []).find((b) => b.currency === currency);
      txjson.Amount = {
        currency,
        value: amount,
        issuer: balanceEntry?.issuer || '',
      };
    }

    // Sign via Xaman
    setShowXaman(true);
    const result = await xaman.requestSign(txjson, {
      identifier: 'workledger-send',
      instruction: `Send ${amount} ${currency} to ${destination.slice(0, 8)}...`,
    });

    if (result) {
      setSendSuccess(true);
      // Trigger balance refresh after short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2500);
    }
  };

  // Show Xaman signing modal when signing
  if (showXaman && xaman.status !== 'idle') {
    return (
      <>
        <XamanSignModal
          isOpen={true}
          onClose={() => {
            xaman.cancel();
            setShowXaman(false);
          }}
          status={xaman.status}
          qrUrl={xaman.qrUrl}
          deeplink={xaman.deeplink}
          error={xaman.error}
          expiresIn={xaman.expiresIn}
          instruction={`Send ${amount} ${currency}`}
          autoCloseDelay={0}
        />
        {/* Success overlay */}
        {sendSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative bg-surface border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-white font-semibold text-lg">Payment Sent!</p>
              <p className="text-gray-400 text-sm mt-2">
                {amount} {currency} sent successfully
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-brand-400" />
            </div>
            <h3 className="font-semibold text-white">Send Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-alt text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Destination */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Destination Address
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-alt border border-border text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-sm"
            />
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Amount
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2.5 rounded-lg bg-surface-alt border border-border text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-surface-alt border border-border text-white focus:outline-none focus:border-brand-500 text-sm min-w-[110px]"
              >
                {currencyOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.icon} {c.code}
                  </option>
                ))}
              </select>
            </div>
            {selectedBalance && (
              <p className="text-xs text-gray-500 mt-1.5">
                Available: {selectedBalance.display_value} {currency}
                <button
                  type="button"
                  onClick={() => setAmount(selectedBalance.value)}
                  className="ml-2 text-brand-400 hover:text-brand-300"
                >
                  Max
                </button>
              </p>
            )}
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            Sign with Xaman
          </button>

          <p className="text-xs text-gray-600 text-center">
            You&apos;ll be asked to confirm in your Xaman wallet app
          </p>
        </form>
      </div>
    </div>
  );
}
