'use client';

// ============================================
// MCCCard — Full credential card
// ============================================
// Shows the complete token: deliverable preview image, all smart contract
// metadata, star rating, and the On-Chain Attributes block that mirrors
// the IPFS JSON exactly (what XUMM / xrpscan.com / any XRPL browser reads).
//
// Per-taxon identity:
//   Taxon 1 — Work Credential      — burgundy  (#2A1010)
//   Taxon 2 — License              — deep green (#081A12)
//   Taxon 3 — Access Pass          — deep purple (#140A2E)
//   Taxon 4 — Client Completion    — pastel blue (#EDF6FF)

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import type { MCCRecord } from '@/types';
import { formatDate } from '@/lib/utils';
import MCCSphere from './MCCSphere';

// Sandbox fixture id — only this MCC gets the federal-design experiments.
// See src/lib/demo-data.ts for the mcc-005-federal record.
const FEDERAL_SANDBOX_ID = 'mcc-005-federal';

// ─── Per-taxon theme ──────────────────────────────────────────────────────────
type TaxonTheme = {
  cardBg: string; cardBorder: string; headerBg: string;
  text: string; textMuted: string;
  badgeBg: string; badgeBorder: string; accentColor: string;
  barColor: string; bottomBg: string;
  label: string; labelShort: string;
};
const THEMES: Record<number, TaxonTheme> = {
  1: { cardBg:'#2A1010', cardBorder:'#6B2E2E', headerBg:'#3D1A1A', text:'rgba(255,255,255,0.95)', textMuted:'rgba(255,220,200,0.65)', badgeBg:'rgba(255,100,80,0.18)', badgeBorder:'rgba(255,100,80,0.35)', accentColor:'#F4A17A', barColor:'rgba(244,161,122,0.45)', bottomBg:'rgba(0,0,0,0.3)', label:'WORK CREDENTIAL', labelShort:'T1 · WORK' },
  2: { cardBg:'#081A12', cardBorder:'#1E5C3A', headerBg:'#0D2B20', text:'rgba(255,255,255,0.95)', textMuted:'rgba(160,240,200,0.65)', badgeBg:'rgba(40,200,120,0.15)', badgeBorder:'rgba(40,200,120,0.35)', accentColor:'#4ADE80', barColor:'rgba(74,222,128,0.4)', bottomBg:'rgba(0,0,0,0.3)', label:'USAGE RIGHT LICENSE', labelShort:'T2 · LICENSE' },
  3: { cardBg:'#140A2E', cardBorder:'#4C2E8A', headerBg:'#1E1040', text:'rgba(255,255,255,0.95)', textMuted:'rgba(200,180,255,0.65)', badgeBg:'rgba(140,80,255,0.18)', badgeBorder:'rgba(140,80,255,0.35)', accentColor:'#A78BFA', barColor:'rgba(167,139,250,0.4)', bottomBg:'rgba(0,0,0,0.3)', label:'ACCESS PASS', labelShort:'T3 · ACCESS' },
  4: { cardBg:'#0B1A2E', cardBorder:'#1E3A5F', headerBg:'#0F2440', text:'rgba(255,255,255,0.95)', textMuted:'rgba(147,197,253,0.65)', badgeBg:'rgba(59,130,246,0.15)', badgeBorder:'rgba(59,130,246,0.35)', accentColor:'#60A5FA', barColor:'rgba(96,165,250,0.4)', bottomBg:'rgba(0,0,0,0.3)', label:'PROJECT COMPLETION', labelShort:'T4 · CLIENT' },
};

// Gradient presets for deliverable preview (used when no real image is set)
const GRADIENTS: Record<string, string> = {
  'gradient:purple-pink':  'linear-gradient(135deg, #4C1D95 0%, #BE185D 60%, #F472B6 100%)',
  'gradient:blue-cyan':    'linear-gradient(135deg, #1E3A8A 0%, #0E7490 60%, #22D3EE 100%)',
  'gradient:orange-red':   'linear-gradient(135deg, #78350F 0%, #B45309 50%, #F97316 100%)',
  'gradient:green-teal':   'linear-gradient(135deg, #064E3B 0%, #0F766E 60%, #34D399 100%)',
  'gradient:indigo-blue':  'linear-gradient(135deg, #312E81 0%, #1D4ED8 60%, #60A5FA 100%)',
  'gradient:pastel-blue':  'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)',
};

// Pick a deterministic gradient from the token ID when none is specified
function autoGradient(seed: string): string {
  const keys = Object.keys(GRADIENTS);
  const idx = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % keys.length;
  return GRADIENTS[keys[idx]];
}

function resolveImage(image: string | undefined, seed: string): string {
  if (!image) return autoGradient(seed);
  if (image.startsWith('gradient:')) return GRADIENTS[image] || autoGradient(seed);
  return image; // real IPFS or HTTP URL
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncateHash(hash: string, head = 8, tail = 6): string {
  if (!hash || hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
function displayId(mcc: MCCRecord): string {
  return `MCC-${mcc.minted_at.slice(0,7)}-${mcc.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="15" height="15" viewBox="0 0 24 24"
          fill={s <= rating ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

// ─── Build on-chain attributes (mirrors IPFS JSON) ───────────────────────────
function buildAttributes(mcc: MCCRecord) {
  const m = mcc.metadata_cache;
  const typeLabels: Record<number,string> = { 1:'Work Credential', 2:'Usage Right License', 3:'Access Pass', 4:'Project Completion' };
  const attrs: Array<{ trait_type: string; value: string | number; copyable?: boolean }> = [];

  attrs.push({ trait_type: 'Type',         value: typeLabels[mcc.taxon] || 'MCC' });
  if (m.work_category)      attrs.push({ trait_type: 'Category',         value: m.work_category });
  if (m.marketplace_rating) attrs.push({ trait_type: 'Rating',           value: `${m.marketplace_rating} / 5` });
  if (m.payment_amount && m.payment_currency)
                            attrs.push({ trait_type: 'Payment',           value: `${m.payment_amount} ${m.payment_currency}` });
  if (m.delivery_date)      attrs.push({ trait_type: 'Delivery Date',    value: m.delivery_date });
  if (m.client_name)        attrs.push({ trait_type: 'Client',           value: m.client_name });
  if (m.creator_name)       attrs.push({ trait_type: 'Creator',          value: m.creator_name });
  if (m.milestone_sequence) attrs.push({ trait_type: 'Milestone',        value: `#${m.milestone_sequence}` });
  if (m.rights)             attrs.push({ trait_type: 'Rights',           value: m.rights });
  if (m.territory)          attrs.push({ trait_type: 'Territory',        value: m.territory });
  if (m.duration)           attrs.push({ trait_type: 'Duration',         value: m.duration });
  if (m.exclusivity)        attrs.push({ trait_type: 'Exclusivity',      value: m.exclusivity });
  if (m.deliverable_hash)   attrs.push({ trait_type: 'Deliverable Hash', value: m.deliverable_hash, copyable: true });
  if (m.contract_hash)      attrs.push({ trait_type: 'Contract Hash',    value: m.contract_hash,    copyable: true });
  if (m.escrow_tx_hash)     attrs.push({ trait_type: 'Escrow TX',        value: truncateHash(m.escrow_tx_hash), copyable: true });
  if (m.escrow_sequence)    attrs.push({ trait_type: 'Escrow Seq.',      value: m.escrow_sequence });
  if (mcc.mint_tx_hash)     attrs.push({ trait_type: 'Mint TX',          value: truncateHash(mcc.mint_tx_hash), copyable: true });
  attrs.push({ trait_type: 'Token ID', value: truncateHash(mcc.mcc_token_id, 10, 6), copyable: true });
  attrs.push({ trait_type: 'Owner',    value: truncateHash(mcc.owner, 8, 6), copyable: true });
  attrs.push({ trait_type: 'Platform', value: 'studioledger.ai' });
  attrs.push({ trait_type: 'Network',  value: 'XRPL Mainnet' });

  return attrs;
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text, color }: { text: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} title="Copy" className="ml-1 opacity-40 hover:opacity-100 transition-opacity shrink-0">
      {copied ? <Check size={10} color={color}/> : <Copy size={10} color={color}/>}
    </button>
  );
}

// ─── DeliveryDocSection — collapsible delivery summary ────────────────────────
function DeliveryDocSection({ doc, theme }: { doc: string; theme: TaxonTheme }) {
  const [expanded, setExpanded] = useState(false);
  const lines = doc.split('\n');
  const previewLines = lines.slice(0, 6).join('\n');

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
          Delivery &amp; License Summary
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
      </div>
      <div
        className="rounded-lg px-3 py-2.5 relative overflow-hidden"
        style={{ backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}
      >
        <pre
          className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono"
          style={{ color: theme.text, maxHeight: expanded ? 'none' : '120px', overflow: 'hidden' }}
        >
          {expanded ? doc : previewLines}
        </pre>
        {!expanded && lines.length > 6 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-10 flex items-end justify-center pb-1.5"
            style={{
              background: `linear-gradient(to top, ${theme.cardBg} 0%, transparent 100%)`,
            }}
          >
            <button
              onClick={() => setExpanded(true)}
              className="text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full"
              style={{ color: theme.accentColor, backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}
            >
              Show full document ↓
            </button>
          </div>
        )}
        {expanded && lines.length > 6 && (
          <button
            onClick={() => setExpanded(false)}
            className="mt-2 text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full"
            style={{ color: theme.accentColor, backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}
          >
            Collapse ↑
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────
interface MCCCardProps { mcc: MCCRecord }

export default function MCCCard({ mcc }: MCCCardProps) {
  const theme  = THEMES[mcc.taxon] ?? THEMES[1];
  const meta   = mcc.metadata_cache;
  const title  = meta.work_title || meta.name || 'Minted Craft Credential';
  const id     = displayId(mcc);
  const attrs  = buildAttributes(mcc);
  const rating = meta.marketplace_rating ?? 0;
  const imgSrc = resolveImage(meta.image, mcc.mcc_token_id);
  const deliverableImg = meta.deliverable_media_url || null;
  const xrplScanUrl = mcc.mcc_token_id
    ? `https://xrpscan.com/nft/${mcc.mcc_token_id}`
    : null;

  // Federal-design sandbox flag — only the Oreo mcc-005-federal card gets the sphere
  // and future federal-design experiments. Keeps production MCCs unchanged.
  const isFederalSandbox = mcc.id === FEDERAL_SANDBOX_ID;

  return (
    <div className="rounded-2xl overflow-hidden border-2 flex flex-col relative"
      style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>

      {/* ── Header band ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ backgroundColor: theme.headerBg, borderColor: theme.cardBorder }}>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold tracking-wide" style={{ color: theme.text }}>
            studioledger.ai · MCC
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
            Minted Craft Credential
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded"
          style={{ color: theme.accentColor, backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
          {theme.label}
        </span>
      </div>

      {/* ── Gradient banner with title ── */}
      <div className="relative w-full" style={{ height: '100px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: imgSrc }} />
        {/* Overlay: title + category */}
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 60%)' }}>
          <h3 className="font-bold text-base leading-tight text-white drop-shadow">{title}</h3>
          {meta.work_category && (
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
              style={{ color: theme.accentColor, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
              {meta.work_category}
            </p>
          )}
        </div>
        {/* Achieved badge top-right */}
        <div className="absolute top-2.5 right-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-sm"
            style={{ color:'#22c55e', backgroundColor:'rgba(0,0,0,0.45)', border:'1px solid rgba(34,197,94,0.5)' }}>
            ✓ Achieved
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-5 space-y-4">

        {/* Description */}
        {meta.description && (
          <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
            {meta.description}
          </p>
        )}

        {/* Star rating + client comment */}
        {rating > 0 && (
          <div className="rounded-xl px-3 py-2.5 space-y-1.5"
            style={{ backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
            <div className="flex items-center gap-2">
              <StarRating rating={rating} color={theme.accentColor} />
              <span className="text-xs font-bold" style={{ color: theme.accentColor }}>{rating}.0 / 5</span>
            </div>
            {meta.marketplace_comment && (
              <p className="text-xs italic leading-relaxed" style={{ color: theme.textMuted }}>
                "{meta.marketplace_comment}"
              </p>
            )}
          </div>
        )}

        {/* Payment + date + client */}
        <div className="flex items-end justify-between gap-3">
          {meta.payment_amount ? (
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: theme.text }}>
                {Number(meta.payment_amount).toLocaleString()}
                <span className="text-sm font-medium ml-1">{meta.payment_currency || 'RLUSD'}</span>
              </p>
              {meta.client_name && (
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{meta.client_name}</p>
              )}
              {meta.creator_name && (
                <p className="text-xs" style={{ color: theme.textMuted }}>{meta.creator_name}</p>
              )}
            </div>
          ) : <div />}
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              {meta.delivery_date ? formatDate(meta.delivery_date) : formatDate(mcc.minted_at)}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>
              Minted {formatDate(mcc.minted_at)}
            </p>
          </div>
        </div>

        {/* ── Deliverable Preview — captured pixel snapshot at mint time ── */}
        {deliverableImg && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                Deliverable Preview (low-res)
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
            </div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: theme.cardBorder }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deliverableImg}
                alt={title}
                className="w-full"
                style={{ display: 'block', maxHeight: '240px', objectFit: 'cover' }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              {meta.deliverable_hash && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono" style={{ color: theme.textMuted }}>
                    SHA-256: {truncateHash(meta.deliverable_hash, 12, 8)}
                  </span>
                  <CopyButton text={meta.deliverable_hash} color={theme.accentColor} />
                </div>
              )}
              <span className="text-[8px] font-mono uppercase" style={{ color: theme.textMuted, opacity: 0.6 }}>
                Captured at mint
              </span>
            </div>
          </div>
        )}

        {/* License terms (taxon 2) */}
        {(meta.rights || meta.territory || meta.exclusivity) && (
          <div className="rounded-lg px-3 py-2 text-xs space-y-1"
            style={{ backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
            {meta.exclusivity && (
              <p className="font-bold uppercase tracking-wider text-[10px]" style={{ color: theme.accentColor }}>
                {meta.exclusivity}
              </p>
            )}
            {meta.rights    && <p style={{ color: theme.text }}>{meta.rights}</p>}
            {meta.territory && <p style={{ color: theme.textMuted }}>{meta.territory}</p>}
            {meta.duration  && <p style={{ color: theme.textMuted }}>{meta.duration}</p>}
          </div>
        )}

        {/* ── Deliverable Files ── */}
        {meta.deliverable_files && meta.deliverable_files.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                Files Delivered
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
            </div>
            <div className="space-y-1.5">
              {meta.deliverable_files.map((f, i) => (
                <div key={i} className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
                  <p className="text-[11px] font-semibold font-mono truncate" style={{ color: theme.text }}>{f.name}</p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    {f.format && <span className="text-[9px]" style={{ color: theme.textMuted }}>{f.format}</span>}
                    {f.role && <span className="text-[9px]" style={{ color: theme.accentColor }}>{f.role}</span>}
                  </div>
                  {f.notes && <p className="text-[9px] mt-0.5" style={{ color: theme.textMuted }}>{f.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Delivery & License Summary Document ── */}
        {meta.delivery_doc && (
          <DeliveryDocSection doc={meta.delivery_doc} theme={theme} />
        )}

        {/* ── On-Chain Attributes ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              On-Chain Attributes · XRPL
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: theme.cardBorder }} />
          </div>
          {/* Federal sandbox: guilloche philigram (watermark) behind the full
             attribute grid. Crosshatch weave variant — TWO chevron families
             overlaid with a quarter-period phase offset. Each family is the
             chevron construction (triangle-wave stripes, amplitudes stepping
             -maxAmp..+maxAmp, all converging at their own zero crossings).
             Family B's zero crossings land on Family A's peaks (and vice
             versa), so where one family converges into a node the other
             fans wide open. The overlap reads as a diamond lattice instead
             of linear chevrons — classic certificate crosshatch weave.
             Per-family stripe count is halved so the combined density
             stays legible; stroke and opacity are trimmed a touch because
             double-hatching compounds visual weight. */}
          <div className="relative">
            {isFederalSandbox && (() => {
              const W = 320, H = 180, cy = H / 2;
              const freq = 3.0;       // slightly looser than the pure chevron —
                                      // crossing pattern adds its own density
              const perFamily = 14;   // ~half the chevron count per family;
                                      // doubled families keep total ~equal
              const maxAmp = 78;      // unchanged — fans still fill vertical
              const samples = 260;    // enough vertices for crisp peaks
              // Triangle wave, unit-amplitude: (2/π)·arcsin(sin θ).
              const tri = (theta: number) => (2 / Math.PI) * Math.asin(Math.sin(theta));
              // Two families at phase offsets 0 and π/2 (quarter period) so
              // A's peaks align with B's zero crossings → diamond crosshatch.
              const families = [0, Math.PI / 2];
              const paths: string[] = [];
              for (const phaseShift of families) {
                for (let i = 0; i < perFamily; i++) {
                  const amp = ((i + 0.5) / perFamily - 0.5) * 2 * maxAmp;
                  let d = '';
                  for (let s = 0; s <= samples; s++) {
                    const x = (s / samples) * W;
                    const phase = (2 * Math.PI * freq * s) / samples + phaseShift;
                    const y = cy + amp * tri(phase);
                    d += (s === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
                  }
                  paths.push(d);
                }
              }
              return (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  aria-hidden
                  style={{ zIndex: 0 }}
                >
                  {paths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      stroke={theme.accentColor}
                      strokeWidth="0.3"
                      fill="none"
                      opacity="0.22"
                    />
                  ))}
                </svg>
              );
            })()}

            <div className="relative grid grid-cols-2 gap-x-4 gap-y-2" style={{ zIndex: 1 }}>
              {attrs.map(a => (
                <div key={a.trait_type} className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5" style={{ color: theme.textMuted }}>
                    {a.trait_type}
                  </p>
                  <div className="flex items-center min-w-0">
                    <p className="text-[11px] font-mono truncate" style={{ color: theme.text }}>
                      {String(a.value)}
                    </p>
                    {a.copyable && <CopyButton text={String(a.value)} color={theme.accentColor} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(xrplScanUrl || isFederalSandbox) && (
            <div className="mt-4 flex items-center gap-3">
              {/* Federal sandbox: sphere sits on the FAR LEFT, no frame, just a
                 soft radial halo bleeding outward. Continent dots reveal a tiny
                 rotating world as the credential's live-on-chain mark. */}
              {isFederalSandbox && (
                <>
                  {/* Variant 5 pulse — keyframes injected inline to bypass
                     Tailwind's build step (matches the marquee's approach).
                     3.4s ease-in-out infinite: 0.95 → 1.15 scale, 0.7 → 1.0 alpha. */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes mccHaloPulse {
                      0%, 100% { transform: scale(0.95); opacity: 0.7; }
                      50%      { transform: scale(1.15); opacity: 1;   }
                    }
                  ` }} />
                  <div
                    className="relative flex items-center justify-center shrink-0"
                    style={{ width: 47, height: 47 }}
                    title="Live on XRPL · continents trace real-time rotation"
                  >
                    {/* Halo — radial gradient fading from accent to transparent,
                       bleeds 6px past the sphere edge so the pulse reads without
                       cropping. Blurred slightly so the edge never shows as a ring. */}
                    <div
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        inset: '-6px',
                        background: `radial-gradient(circle, ${theme.accentColor}55 0%, ${theme.accentColor}22 40%, ${theme.accentColor}00 70%)`,
                        filter: 'blur(2px)',
                        animation: 'mccHaloPulse 3.4s ease-in-out infinite',
                        transformOrigin: 'center',
                        willChange: 'transform, opacity',
                      }}
                    />
                    <MCCSphere
                      size={47}
                      color={theme.accentColor}
                      pattern="continents"
                      className="relative"
                    />
                  </div>
                </>
              )}

              {xrplScanUrl && (
                <a href={xrplScanUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold hover:opacity-75 transition-opacity"
                  style={{ color: theme.accentColor }}>
                  <ExternalLink size={11} />
                  View on xrpscan.com
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: barcode + ID ── */}
      <div className="px-4 py-3 border-t space-y-2"
        style={{ borderColor: theme.cardBorder, backgroundColor: theme.bottomBg }}>
        <div className="flex items-end gap-px h-8">
          {Array.from({ length: 40 }).map((_, i) => {
            const p = [100,65,85,45,90,55,100,70,50,95,75,40];
            return (
              <div key={i} className="flex-1 min-w-[1.5px] rounded-sm"
                style={{ height: `${p[i % p.length]}%`, backgroundColor: theme.barColor }} />
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold" style={{ color: theme.textMuted }}>{id}</span>
          <span className="text-[10px] font-mono" style={{ color: theme.textMuted }}>
            {truncateHash(mcc.mcc_token_id, 8, 6)}
          </span>
        </div>
        <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: theme.textMuted }}>
          XRPL · {truncateHash(mcc.owner, 8, 6)} · {theme.labelShort}
        </p>
      </div>

      {/* ── Kinetic readout (federal sandbox only) ──
         Currency-paper detail promoted to a legible ticker: real MCC data
         (token id, tx hashes, sequence) scrolling across the very bottom strip.
         Sits AFTER the barcode footer so it reads as the literal last line of
         the card. Content is repeated 4× so the CSS `translateX(-50%)` loop
         lands on an identical slice — seamless infinite motion with no reset.

         Animation is inlined (keyframes + style) instead of going through
         Tailwind config, so it runs regardless of build state and without
         requiring a dev-server restart. */}
      {isFederalSandbox && (() => {
        const unit =
          [
            mcc.mcc_token_id,
            mcc.mint_tx_hash ? `MINT:${mcc.mint_tx_hash}` : null,
            meta.deliverable_hash ? `SHA256:${meta.deliverable_hash}` : null,
            meta.escrow_tx_hash ? `ESCROW:${meta.escrow_tx_hash}` : null,
            meta.escrow_sequence ? `SEQ:${meta.escrow_sequence}` : null,
            'XRPL · MAINNET · STUDIOLEDGER',
          ]
            .filter(Boolean)
            .join('  ·  ') + '  ·  ';
        const tickerText = unit.repeat(4);
        return (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @keyframes mccTickerScroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                `,
              }}
            />
            <div
              className="relative overflow-hidden border-t"
              style={{
                borderColor: theme.cardBorder,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '6px 0',
              }}
              aria-hidden
              title="Live ticker · on-chain identifiers"
            >
              <div
                className="whitespace-nowrap inline-block font-mono"
                style={{
                  fontSize: '10px',
                  lineHeight: 1.2,
                  letterSpacing: '0.05em',
                  color: theme.accentColor,
                  opacity: 0.85,
                  animation: 'mccTickerScroll 40s linear infinite',
                  willChange: 'transform',
                }}
              >
                {tickerText}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
