'use client';

// ============================================
// Balance Page — User's Currency Accounts
// ============================================
// Shows total balance (USD reference, displayed in user's local currency),
// individual currency accounts, and transaction history.
// Trust lines are handled automatically — users never see XRPL plumbing.

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Send, Copy, Check } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import BalanceCard from '@/components/ui/BalanceCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard, SkeletonRow } from '@/components/ui/LoadingSkeleton';
import { ReceiveModal } from '@/components/wallet/ReceiveModal';
import { SendModal } from '@/components/wallet/SendModal';
import { useBalances, useTransactions, useUser } from '@/hooks';
import { useMCCs } from '@/hooks/use-mccs';
import { CURRENCIES, STATIC_EXCHANGE_RATES } from '@/config/constants';
import { useWalletStore } from '@/stores/wallet-store';
import { formatAmount, formatDate, truncateAddress } from '@/lib/utils';
import type { MCCRecord } from '@/types';

// Exchange rates sourced from constants — Phase 1 static, Phase 2 live DEX feed.
const EXCHANGE_RATES = STATIC_EXCHANGE_RATES;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  JPY: '¥',
  XRP: '',
  RLUSD: '',
  USDC: '',
  USDT: '',
};

function convertAmount(usdAmount: number, toCurrency: string): string {
  const rate = EXCHANGE_RATES[toCurrency] || 1;
  const converted = usdAmount * rate;
  const symbol = CURRENCY_SYMBOLS[toCurrency] || '';
  const decimals = toCurrency === 'JPY' ? 0 : 2;

  if (symbol) {
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  return `${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${toCurrency}`;
}

export default function WalletPage() {
  const { displayCurrency, setDisplayCurrency } = useWalletStore();
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: user } = useUser();
  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useBalances();
  const { data: txData, isLoading: txLoading } = useTransactions();
  const { data: mccData, isLoading: mccLoading } = useMCCs();

  // Compute USD value of each MCC from its payment_amount / payment_currency metadata
  const mccList: MCCRecord[] = mccData?.mccs || [];
  const mccUSDValue = mccList.reduce((sum, mcc) => {
    const amt = parseFloat(mcc.metadata_cache?.payment_amount || '0');
    const cur = mcc.metadata_cache?.payment_currency || 'RLUSD';
    const rate = STATIC_EXCHANGE_RATES[cur] ?? 1;
    return sum + amt / rate;
  }, 0);

  const currencyUSD = (balances || []).reduce((sum, b) => sum + b.usd_equivalent, 0);
  const totalUSD = currencyUSD + mccUSDValue;

  const isMarketmaker = user?.role === 'marketplace';
  const MCC_TAXON_LABELS: Record<number, string> = { 1: 'Work Credential', 2: 'License', 3: 'Access Pass', 4: 'Completion Record' };
  const transactions = txData?.transactions || [];
  const address = user?.xrpl_address || '';

  // Copy address to clipboard
  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      const el = document.createElement('textarea');
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <>
      <TopBar title="Balance" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Total Balance Hero — all fonts black, default currency RLUSD */}
        <div
          className="rounded-xl p-6 mb-6 border"
          style={{
            background: 'linear-gradient(135deg, var(--escrow) 0%, var(--accent-purple) 100%)',
            color: '#0A0A0A',
            borderColor: 'var(--separator)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <p className="text-sm mb-1" style={{ color: '#0A0A0A', opacity: 0.95 }}>{isMarketmaker ? 'Project Budget' : 'Total Balance'}</p>
          {balancesLoading ? (
            <div className="h-9 w-48 rounded animate-pulse mb-4" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
          ) : (
            <div className="mb-2">
              <p className="text-3xl font-bold" style={{ color: '#0A0A0A' }}>{convertAmount(totalUSD, displayCurrency)}</p>
              {/* Secondary: always show USD + XRP unless one is the primary */}
              <div className="flex gap-3 mt-1 text-sm" style={{ color: '#0A0A0A', opacity: 0.85 }}>
                {displayCurrency !== 'USD' && (
                  <span>{convertAmount(totalUSD, 'USD')}</span>
                )}
                {displayCurrency !== 'XRP' && (
                  <span>{convertAmount(totalUSD, 'XRP')}</span>
                )}
              </div>
            </div>
          )}

          {/* XRPL Address Display */}
          {address && (
            <div className="flex items-center gap-2 mb-4">
              <code className="text-sm font-mono" style={{ color: '#0A0A0A', opacity: 0.9 }}>
                {truncateAddress(address, 8)}
              </code>
              <button
                onClick={handleCopy}
                className="p-1 rounded transition-colors hover:opacity-90"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" style={{ color: '#0A0A0A' }} />
                ) : (
                  <Copy className="w-3.5 h-3.5" style={{ color: '#0A0A0A', opacity: 0.8 }} />
                )}
              </button>
              {copied && (
                <span className="text-xs" style={{ color: '#0A0A0A' }}>Copied!</span>
              )}
            </div>
          )}

          {/* Currency Display Toggle */}
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setDisplayCurrency(c.code)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={
                  displayCurrency === c.code
                    ? { backgroundColor: 'rgba(255,255,255,0.95)', color: '#0A0A0A' }
                    : { backgroundColor: 'rgba(0,0,0,0.15)', color: '#0A0A0A' }
                }
              >
                {c.icon} {c.code}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowSend(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Send size={16} /> {isMarketmaker ? 'Fund Escrow' : 'Send'}
          </button>
          <button
            onClick={() => setShowReceive(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowDownLeft size={16} /> {isMarketmaker ? 'Deposit' : 'Receive'}
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Swap
          </button>
        </div>

        {/* Currency Accounts */}
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{isMarketmaker ? 'Funding Accounts' : 'Currency Accounts'}</h2>
        {balancesLoading ? (
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {(balances || []).map((balance) => {
              const currencyInfo = CURRENCIES.find((c) => c.code === balance.currency);
              return (
                <BalanceCard
                  key={balance.currency}
                  currency={balance.currency}
                  icon={currencyInfo?.icon || '🪙'}
                  balance={balance.display_value}
                  subtext={`~${convertAmount(balance.usd_equivalent, displayCurrency)}`}
                />
              );
            })}
          </div>
        )}

        {/* MCC Holdings */}
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{isMarketmaker ? 'Completion Records' : 'MCC Holdings'}</h2>
        {mccLoading ? (
          <div className="space-y-2 mb-8">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : mccList.length === 0 ? (
          <div className="card mb-8 text-center py-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {isMarketmaker
                ? 'No completion records yet — they\'re minted when you approve and release a milestone.'
                : 'No MCC tokens yet — they\'re minted automatically when a milestone is released.'}
            </p>
          </div>
        ) : (
          <div className="card p-0 mb-8">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {mccList.length} token{mccList.length !== 1 ? 's' : ''}
                </span>
                {[1, 2, 3].map(taxon => {
                  const count = mccList.filter(m => m.taxon === taxon).length;
                  if (!count) return null;
                  return (
                    <span key={taxon} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                      {count} {MCC_TAXON_LABELS[taxon]}
                    </span>
                  );
                })}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                ~{convertAmount(mccUSDValue, displayCurrency)}
              </span>
            </div>

            {/* Individual MCCs */}
            {mccList.map((mcc) => {
              const amt = parseFloat(mcc.metadata_cache?.payment_amount || '0');
              const cur = mcc.metadata_cache?.payment_currency || '';
              const rate = STATIC_EXCHANGE_RATES[cur] ?? 1;
              const usdVal = cur ? amt / rate : 0;
              const taxonLabel = MCC_TAXON_LABELS[mcc.taxon] || 'Token';
              const taxonColor = mcc.taxon === 1
                ? 'var(--accent-purple)'
                : mcc.taxon === 2
                  ? '#7f3ac6'
                  : 'var(--accent-blue)';

              return (
                <div key={mcc.id} className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: 'var(--border)' }}>
                  {/* Token badge */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{ backgroundColor: `${taxonColor}22`, color: taxonColor, border: `1px solid ${taxonColor}44` }}>
                    MCC
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {mcc.metadata_cache?.name || mcc.mcc_token_id}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {taxonLabel}
                      {mcc.metadata_cache?.delivery_date && ` · ${formatDate(mcc.metadata_cache.delivery_date)}`}
                    </p>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0">
                    {amt > 0 && cur ? (
                      <>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {amt.toLocaleString()} {cur}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          ~{convertAmount(usdVal, displayCurrency)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Transaction History */}
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{isMarketmaker ? 'Spending History' : 'Recent Transactions'}</h2>
        {txLoading ? (
          <div className="card p-0">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <div className="card p-0">
            {transactions.map((tx) => {
              const isIncoming = tx.tx_type === 'EscrowFinish';
              return (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isIncoming ? 'var(--status-active-bg)' : 'var(--accent-blue-bg)',
                      color: isIncoming ? 'var(--status-active)' : 'var(--accent-blue)',
                    }}
                  >
                    {isIncoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{tx.tx_type.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{truncateAddress(tx.tx_hash)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium" style={{ color: isIncoming ? 'var(--status-active)' : 'var(--text)' }}>
                      {isIncoming ? '+' : ''}{formatAmount(tx.amount, tx.currency)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {convertAmount(parseFloat(tx.amount) || 0, displayCurrency)}
                      {' · '}
                      {convertAmount(parseFloat(tx.amount) || 0, 'XRP')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.created_at)}</p>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No transactions yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReceiveModal
        isOpen={showReceive}
        onClose={() => setShowReceive(false)}
        address={address}
      />
      <SendModal
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        balances={balances || []}
        onSuccess={() => refetchBalances()}
      />
    </>
  );
}
