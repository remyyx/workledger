'use client';

import type { MCCRecord } from '@/types';
import { formatDate } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

// Per-taxon row accent (badge bg, border, text color, dot color)
const TAXON_ROW_STYLES: Record<number, {
  dot: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
}> = {
  1: {
    dot: '#F4A17A',
    badgeBg: 'rgba(244,161,122,0.12)',
    badgeBorder: 'rgba(244,161,122,0.3)',
    badgeText: '#F4A17A',
    label: 'Work Credential',
  },
  2: {
    dot: '#4ADE80',
    badgeBg: 'rgba(74,222,128,0.12)',
    badgeBorder: 'rgba(74,222,128,0.3)',
    badgeText: '#4ADE80',
    label: 'License',
  },
  3: {
    dot: '#A78BFA',
    badgeBg: 'rgba(167,139,250,0.12)',
    badgeBorder: 'rgba(167,139,250,0.3)',
    badgeText: '#A78BFA',
    label: 'Access Pass',
  },
  4: {
    dot: '#60A5FA',
    badgeBg: 'rgba(96,165,250,0.12)',
    badgeBorder: 'rgba(96,165,250,0.3)',
    badgeText: '#60A5FA',
    label: 'Client Record',
  },
};

function MiniStars({ rating, color }: { rating: number; color: string }) {
  return (
    <span className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="10" height="10" viewBox="0 0 24 24"
          fill={s <= rating ? color : 'none'}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

function displayId(mcc: MCCRecord): string {
  const datePart = mcc.minted_at.slice(0, 7);
  const idPart = mcc.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `MCC-${datePart}-${idPart}`;
}

interface MCCRowProps {
  mcc: MCCRecord;
  onClick: () => void;
}

export default function MCCRow({ mcc, onClick }: MCCRowProps) {
  const meta = mcc.metadata_cache;
  const title = meta.work_title || meta.name || 'Minted Craft Credential';
  const style = TAXON_ROW_STYLES[mcc.taxon] ?? TAXON_ROW_STYLES[1];
  const rating = meta.marketplace_rating ?? 0;
  const id = displayId(mcc);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border text-left transition-all hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/20"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Taxon dot + badge */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap"
          style={{ backgroundColor: style.badgeBg, border: `1px solid ${style.badgeBorder}`, color: style.badgeText }}
        >
          {style.label}
        </span>
      </div>

      {/* Title + rating row */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {rating > 0 && <MiniStars rating={rating} color={style.dot} />}
          {meta.client_name && (
            <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{meta.client_name}</span>
          )}
          {meta.work_category && !meta.client_name && (
            <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{meta.work_category}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      {meta.payment_amount != null && (
        <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
          {Number(meta.payment_amount).toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{meta.payment_currency || 'RLUSD'}</span>
        </span>
      )}

      {/* Date */}
      <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
        {formatDate(mcc.minted_at)}
      </span>

      {/* Status */}
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
        style={{ color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
      >
        ✓
      </span>

      {/* ID */}
      <span className="shrink-0 text-[10px] font-mono hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
        {id}
      </span>

      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
    </button>
  );
}
