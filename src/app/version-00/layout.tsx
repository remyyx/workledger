import Link from 'next/link';
import './version-00.css';

export default function Version00Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="version-00-preview min-h-screen flex flex-col">
      {/* Top bar: back link + label */}
      <header
        className="h-14 px-4 flex items-center justify-between shrink-0 border-b"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/dashboard"
          className="text-sm font-medium hover:opacity-90"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ← Back to Dashboard (v1.0)
        </Link>
        <span
          className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--escrow)', backgroundColor: 'var(--escrow-bg)' }}
        >
          Design v00 — Archive
        </span>
      </header>
      {children}
    </div>
  );
}
