'use client';

// ============================================
// MCCMiniPreview — inline MCC badge on contract page
// ============================================
// Shown below a released milestone row to surface the minted credential.
// Displays: gradient/image thumbnail, type badge, title, stars, amount, chain link.

import { ExternalLink } from 'lucide-react';
import type { MCCRecord } from '@/types';
import { formatDate } from '@/lib/utils';

// Gradient map (mirrors MCCCard)
const GRADIENTS: Record<string, string> = {
  'gradient:purple-pink':  'linear-gradient(135deg, #4C1D95 0%, #BE185D 60%, #F472B6 100%)',
  'gradient:blue-cyan':    'linear-gradient(135deg, #1E3A8A 0%, #0E7490 60%, #22D3EE 100%)',
  'gradient:orange-red':   'linear-gradient(135deg, #78350F 0%, #B45309 50%, #F97316 100%)',
  'gradient:green-teal':   'linear-gradient(135deg, #064E3B 0%, #0F766E 60%, #34D399 100%)',
  'gradient:indigo-blue':  'linear-gradient(135deg, #312E81 0%, #1D4ED8 60%, #60A5FA 100%)',
  'gradient:pastel-blue':  'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)',
};

function resolveGradient(image: string | undefined, seed: string): string {
  if (!image) {
    const keys = Object.keys(GRADIENTS);
    const idx = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % keys.length;
    return GRADIENTS[keys[idx]];
  }
  if (image.startsWith('gradient:')) return GRADIENTS[image] || GRADIENTS['gradient:orange-red'];
  return image;
}

function StarRow({ rating, color }: { rating: number; color: string }) {
  return (
    <span className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="11" height="11" viewBox="0 0 24 24"
          fill={s <= rating ? color : 'none'} stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

const TAXON_LABELS: Record<number, string> = {
  1: 'Work Credential',
  2: 'License',
  3: 'Access Pass',
  4: 'Client Record',
};

const TAXON_ACCENT: Record<number, string> = {
  1: '#F4A17A',
  2: '#4ADE80',
  3: '#A78BFA',
  4: '#60A5FA',
};

interface Props { mcc: MCCRecord }

export default function MCCMiniPreview({ mcc }: Props) {
  const meta  = mcc.metadata_cache;
  const title = meta.work_title || meta.name || 'Minted Craft Credential';
  const thumbSrc = meta.deliverable_media_url || null;
  const imgBg = resolveGradient(meta.image, mcc.mcc_token_id);
  const rating = meta.marketplace_rating ?? 0;
  const accent = TAXON_ACCENT[mcc.taxon] ?? '#F4A17A';
  const label  = TAXON_LABELS[mcc.taxon] ?? 'Token';
  const xrplUrl = `https://xrpscan.com/nft/${mcc.mcc_token_id}`;

  return (
    <div
      className="mx-3 mb-3 rounded-xl overflow-hidden border flex"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderColor: `${accent}33` }}
    >
      {/* Thumbnail strip */}
      <div className="relative shrink-0 w-24" style={{ height: '88px', overflow: 'hidden', flexShrink: 0 }}>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: imgBg }} />
        )}
        {/* MCC badge overlay */}
        <div className="absolute bottom-1.5 left-1.5">
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: accent, border: `1px solid ${accent}55` }}
          >
            MCC
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2.5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>{label}</span>
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>· {formatDate(mcc.minted_at)}</span>
          </div>
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</p>
          {meta.work_category && (
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{meta.work_category}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            {rating > 0 && <StarRow rating={rating} color={accent} />}
            {meta.payment_amount && (
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                {Number(meta.payment_amount).toLocaleString()} <span style={{ color: 'var(--text-muted)' }}>{meta.payment_currency || 'RLUSD'}</span>
              </span>
            )}
          </div>
          <a
            href={xrplUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[9px] hover:opacity-75 transition-opacity"
            style={{ color: accent }}
          >
            <ExternalLink size={9} />
            xrpscan
          </a>
        </div>
      </div>

      {/* Right: "✓ Minted" seal */}
      <div className="shrink-0 flex items-center px-3 border-l" style={{ borderColor: `${accent}22` }}>
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center mb-1 mx-auto text-sm"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}
          >
            ✓
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#22c55e' }}>Minted</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>on-chain</p>
        </div>
      </div>
    </div>
  );
}
