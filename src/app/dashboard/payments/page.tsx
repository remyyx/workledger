'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { CreditCard, Building2, Wallet, Plus, Check, ChevronRight, Smartphone, Shield } from 'lucide-react';
import { useUser } from '@/hooks';

// ============================================
// Payment Methods Page
// ============================================
// Three blocks: Card Wallet, Bank Account, Crypto Wallet
// Users can add multiple payment methods per block.
// Any send/receive action across the platform references
// this system to select a funding source.

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto';
  label: string;
  detail: string;
  isDefault: boolean;
}

// Placeholder data — will come from API/database in Phase 2
const mockMethods: PaymentMethod[] = [];

export default function PaymentsPage() {
  const { data: user } = useUser();
  const isMarketmaker = user?.role === 'marketplace';
  const [methods] = useState<PaymentMethod[]>(mockMethods);

  const cardMethods = methods.filter((m) => m.type === 'card');
  const bankMethods = methods.filter((m) => m.type === 'bank');
  const cryptoMethods = methods.filter((m) => m.type === 'crypto');

  return (
    <>
      <TopBar title="Payments" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs max-w-lg" style={{ color: 'var(--text-muted)' }}>
            {isMarketmaker
              ? 'Manage how you fund projects, deposit into escrow, and pay creators. Add one or multiple payment methods — any transaction on StudioLedger will let you choose from your saved methods.'
              : 'Manage how you fund escrows, receive payments, and settle contracts. Add one or multiple payment methods — any transaction on StudioLedger will let you choose from your saved methods.'}
          </p>
        </div>

        {/* Payment Method Blocks */}
        <div className="space-y-6">

          {/* Block 1: Crypto Wallet */}
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--escrow-bg)' }}>
                  <Wallet className="w-5 h-5" style={{ color: 'var(--escrow)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Crypto Wallet</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connect your preferred blockchain wallet</p>
                </div>
              </div>
              <button
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                onClick={() => alert('Connect a Wallet — redirecting to Balance page')}
              >
                <Plus className="w-4 h-4" />
                Connect Wallet
              </button>
            </div>
            <div className="px-5 py-4">
              {cryptoMethods.length > 0 ? (
                <div className="space-y-3">
                  {cryptoMethods.map((method) => (
                    <PaymentMethodRow key={method.id} method={method} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <Wallet className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      No crypto wallets connected. Link your wallet to transact directly on XRPL.
                    </p>
                  </div>
                  {/* Supported wallets */}
                  <div className="grid grid-cols-2 gap-2">
                    <WalletOption
                      name="Xaman"
                      description="XRPL native wallet"
                      icon={<Smartphone className="w-4 h-4" />}
                      available
                    />
                    <WalletOption
                      name="MetaMask"
                      description="Coming soon"
                      icon={<Shield className="w-4 h-4" />}
                      available={false}
                    />
                    <WalletOption
                      name="GemWallet"
                      description="Coming soon"
                      icon={<Wallet className="w-4 h-4" />}
                      available={false}
                    />
                    <WalletOption
                      name="Crossmark"
                      description="Coming soon"
                      icon={<Wallet className="w-4 h-4" />}
                      available={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Block 2: Card Wallet */}
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-blue-bg)' }}>
                  <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Card Wallet</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Credit or debit cards for instant funding</p>
                </div>
              </div>
              <button
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                onClick={() => alert('Add a Card — coming soon (Stripe integration Phase 2)')}
              >
                <Plus className="w-4 h-4" />
                Add a Card
              </button>
            </div>
            <div className="px-5 py-4">
              {cardMethods.length > 0 ? (
                <div className="space-y-3">
                  {cardMethods.map((method) => (
                    <PaymentMethodRow key={method.id} method={method} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <CreditCard className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No cards added yet. Add a credit or debit card to fund escrows instantly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Block 3: Bank Account */}
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-green-bg)' }}>
                  <Building2 className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Bank Account</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wire transfers and direct deposits</p>
                </div>
              </div>
              <button
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                onClick={() => alert('Add a Bank Account — coming soon (Phase 2)')}
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>
            <div className="px-5 py-4">
              {bankMethods.length > 0 ? (
                <div className="space-y-3">
                  {bankMethods.map((method) => (
                    <PaymentMethodRow key={method.id} method={method} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <Building2 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No bank accounts linked. Add your BSB, IBAN, or SWIFT details to receive wire transfers.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer note */}
        <div className="mt-8 px-4 py-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong>{' '}
            {isMarketmaker
              ? 'When you fund a project or release payment on StudioLedger, a popup will let you select from your saved payment methods — or add a new one on the spot. Your payment details are securely stored and never shared.'
              : 'When you send or receive funds on StudioLedger, a popup will let you select from your saved payment methods — or add a new one on the spot. Your payment details are securely stored and never shared.'}
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================
// Sub-components
// ============================================

function PaymentMethodRow({ method }: { method: PaymentMethod }) {
  const iconBg = method.type === 'card' ? 'var(--accent-blue-bg)' : method.type === 'bank' ? 'var(--accent-green-bg)' : 'var(--escrow-bg)';
  const iconColor = method.type === 'card' ? 'var(--accent-blue)' : method.type === 'bank' ? 'var(--accent-green)' : 'var(--escrow)';
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer"
      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          {method.type === 'card' && <CreditCard className="w-4 h-4" style={{ color: iconColor }} />}
          {method.type === 'bank' && <Building2 className="w-4 h-4" style={{ color: iconColor }} />}
          {method.type === 'crypto' && <Wallet className="w-4 h-4" style={{ color: iconColor }} />}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{method.label}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{method.detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {method.isDefault && (
          <span
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ color: 'var(--status-active)', backgroundColor: 'var(--status-active-bg)' }}
          >
            <Check className="w-3 h-3" />
            Default
          </span>
        )}
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </div>
  );
}

function WalletOption({
  name,
  description,
  icon,
  available,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}) {
  return (
    <button
      disabled={!available}
      className="flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: available ? 'var(--border)' : 'var(--separator)',
        backgroundColor: available ? 'var(--bg-elevated)' : 'var(--bg-inset)',
      }}
      onClick={() => {
        if (available) alert(`Connect ${name} — redirecting to Balance page`);
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: available ? 'var(--escrow-bg)' : 'var(--bg-inset)',
          color: available ? 'var(--escrow)' : 'var(--text-tertiary)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: available ? 'var(--text)' : 'var(--text-tertiary)' }}>{name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </button>
  );
}
