'use client';

// ============================================
// WalletConnectBanner — New User Wallet Onboarding
// ============================================
// Shows when a user has no XRPL address linked.
// Displays all supported crypto wallets with connect options.
// Xaman is active; MetaMask, GemWallet, Crossmark coming soon.

import { useState, useCallback } from 'react';
import { Wallet, Smartphone, Shield, X, Link2 } from 'lucide-react';
import { XamanSignModal } from '@/components/xaman/sign-modal';
import type { XamanSignStatus } from '@/hooks/use-xaman-sign';
import { useQueryClient } from '@tanstack/react-query';

interface WalletConnectBannerProps {
  /** If true, show as full-page overlay instead of inline banner */
  fullPage?: boolean;
  /** Called after wallet is successfully linked */
  onConnected?: (address: string) => void;
}

const walletOptions = [
  {
    name: 'Xaman',
    description: 'XRPL native wallet',
    icon: Smartphone,
    available: true,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    name: 'MetaMask',
    description: 'Coming soon',
    icon: Shield,
    available: false,
    color: 'text-gray-500',
    bgColor: 'bg-gray-800',
  },
  {
    name: 'GemWallet',
    description: 'Coming soon',
    icon: Wallet,
    available: false,
    color: 'text-gray-500',
    bgColor: 'bg-gray-800',
  },
  {
    name: 'Crossmark',
    description: 'Coming soon',
    icon: Wallet,
    available: false,
    color: 'text-gray-500',
    bgColor: 'bg-gray-800',
  },
];

export default function WalletConnectBanner({ fullPage = false, onConnected }: WalletConnectBannerProps) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  // Xaman sign-in state
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<XamanSignStatus>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setStatus('idle');
    setQrUrl(null);
    setDeeplink(null);
    setError(null);
    setExpiresIn(null);
  }, []);

  async function handleConnectXaman() {
    setError(null);
    setModalOpen(true);
    setStatus('creating');

    try {
      // 1. Create Xaman SignIn payload
      const res = await fetch('/api/auth/xaman', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to start wallet connection.');

      setQrUrl(data.qr_png);
      setDeeplink(data.deeplink);
      setStatus('pending');

      // 2. Listen for sign via WebSocket
      const ws = new WebSocket(data.websocket);

      ws.onmessage = async (event) => {
        try {
          const wsData = JSON.parse(event.data);

          if (wsData.expires_in_seconds !== undefined) {
            setExpiresIn(wsData.expires_in_seconds);
          }

          if (wsData.signed !== undefined) {
            ws.close();

            if (wsData.signed === true) {
              setStatus('signed');

              // 3. Verify the signed payload to get the XRPL address
              const verifyRes = await fetch('/api/auth/xaman', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid: data.uuid }),
              });
              const verifyData = await verifyRes.json();

              if (verifyData.authenticated && verifyData.user?.xrpl_address) {
                // 4. Link the XRPL address to the current Google OAuth user
                const linkRes = await fetch('/api/user/wallet-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ xrplAddress: verifyData.user.xrpl_address }),
                });
                const linkData = await linkRes.json();

                if (linkRes.ok) {
                  setStatus('success');
                  // Refresh user profile to pick up the new address
                  queryClient.invalidateQueries({ queryKey: ['user'] });
                  onConnected?.(verifyData.user.xrpl_address);
                } else {
                  setError(linkData.error || 'Failed to link wallet.');
                  setStatus('error');
                }
              } else {
                setError('Could not verify wallet address.');
                setStatus('error');
              }
            } else {
              setStatus('rejected');
            }
          }

          if (wsData.expired) {
            ws.close();
            setStatus('expired');
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError('Connection failed. Please try again.');
        setStatus('error');
      };
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (dismissed && !fullPage) return null;

  const content = (
    <div className={`${fullPage ? 'max-w-lg mx-auto' : ''} bg-surface border border-border rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Connect your favorite wallets</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Link a crypto wallet to fund escrows, receive payments, and mint credentials on XRPL.
              Your keys stay in your wallet — we never see them.
            </p>
          </div>
        </div>
        {!fullPage && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Wallet options grid */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {walletOptions.map((wallet) => {
            const Icon = wallet.icon;
            return (
              <button
                key={wallet.name}
                disabled={!wallet.available}
                onClick={() => {
                  if (wallet.name === 'Xaman') handleConnectXaman();
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-colors ${
                  wallet.available
                    ? 'border-border bg-surface-alt hover:border-orange-500/30 hover:bg-surface-hover cursor-pointer'
                    : 'border-border/50 bg-surface-alt/50 cursor-not-allowed opacity-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${wallet.bgColor}`}>
                  <Icon className={`w-4 h-4 ${wallet.color}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${wallet.available ? 'text-white' : 'text-gray-600'}`}>
                    {wallet.name}
                  </p>
                  <p className="text-[10px] text-gray-500">{wallet.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {fullPage ? (
        <div className="flex-1 flex items-center justify-center p-6">
          {content}
        </div>
      ) : (
        content
      )}

      <XamanSignModal
        isOpen={modalOpen}
        onClose={handleClose}
        status={status}
        qrUrl={qrUrl}
        deeplink={deeplink}
        error={error}
        expiresIn={expiresIn}
        instruction="Sign to link your XRPL wallet to your StudioLedger account"
        autoCloseDelay={2000}
      />
    </>
  );
}
