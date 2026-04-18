interface BalanceCardProps {
  currency: string;
  icon: string;
  balance: string;
  subtext?: string;
}

export default function BalanceCard({ currency, icon, balance, subtext }: BalanceCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl transition-all duration-200"
      style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="text-xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{currency}</p>
        <p className="text-lg font-semibold truncate" style={{ color: 'var(--text)' }}>{balance}</p>
      </div>
      {subtext && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtext}</p>
      )}
    </div>
  );
}
