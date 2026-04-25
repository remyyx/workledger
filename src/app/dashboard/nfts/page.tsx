'use client';

// ============================================
// Credential Assets Page — split-panel layout
// ============================================
// Left: category filters + scrollable MCCRow list
// Right: MCCCard detail panel (inline, no modal)
// Role-aware: Creator sees T1/T2/T3, Marketplace sees T4/T2.

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import MCCCard from '@/components/ui/MCCCard';
import MCCRow from '@/components/ui/MCCRow';
import { useMCCs, useUser } from '@/hooks';
import { RADIAN_BADGE, MCC_UI_COLORS } from '@/config/constants';
import { cn } from '@/lib/utils';
import { Award, FileKey, Ticket, BadgeCheck, Plus, ChevronLeft } from 'lucide-react';
import type { MCCRecord, MCCTaxon } from '@/types';

function radianFilter(colorVar: string) {
  return `drop-shadow(0 0 ${RADIAN_BADGE.GLOW_PX[0]}px ${colorVar}) drop-shadow(0 0 ${RADIAN_BADGE.GLOW_PX[1]}px ${colorVar}) drop-shadow(0 0 ${RADIAN_BADGE.GLOW_PX[2]}px ${colorVar})`;
}

// All category definitions — filtered per-role below
const allCategories = [
  {
    taxon: 1 as MCCTaxon,
    label: 'Work Credential',
    icon: Award,
    colorVar: MCC_UI_COLORS.CREDENTIAL,
    colorBgVar: 'var(--accent-purple-bg)',
    crDescription: 'Work Credential tokens minted automatically when a milestone escrow is released. Permanent on-chain portfolio.',
    mkDescription: 'Work Credentials earned by creators you hired. Verifiable proof that they delivered.',
    canCreate: false,
    roles: ['creator', 'both'] as string[],      // Primary for creator
  },
  {
    taxon: 2 as MCCTaxon,
    label: 'Usage Right License',
    icon: FileKey,
    colorVar: 'var(--accent-green)',
    colorBgVar: 'var(--accent-green-bg)',
    crDescription: 'Grant usage rights for your creative work on-chain. Define territory, duration, exclusivity, and sublicensing.',
    mkDescription: 'Licenses you hold for creative work. On-chain proof of usage rights purchased.',
    canCreate: true,
    createLabel: 'Create License',
    roles: ['creator', 'marketplace', 'both'] as string[],  // Both roles
  },
  {
    taxon: 3 as MCCTaxon,
    label: 'Access Pass',
    icon: Ticket,
    colorVar: MCC_UI_COLORS.MEMBERSHIP,
    colorBgVar: MCC_UI_COLORS.MEMBERSHIP_BG,
    crDescription: 'Membership and access tokens for clients and community. Use for retainer relationships, loyalty programmes, or VIP access.',
    mkDescription: 'Access passes and memberships from creators you work with.',
    canCreate: true,
    createLabel: 'Create Access Token',
    roles: ['creator', 'both'] as string[],      // Primary for creator
  },
  {
    taxon: 4 as MCCTaxon,
    label: 'Client Completion Record',
    icon: BadgeCheck,
    colorVar: '#60A5FA',
    colorBgVar: 'rgba(96,165,250,0.12)',
    crDescription: 'Completion tokens issued to your clients after payment release.',
    mkDescription: 'Your verified completion records. On-chain proof you funded, approved, and paid for work delivered.',
    canCreate: false,
    roles: ['marketplace', 'both'] as string[],  // Primary for marketplace
  },
];

export default function CredentialAssetsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | MCCTaxon>('all');
  const [selectedMcc, setSelectedMcc] = useState<MCCRecord | null>(null);

  const { data: currentUser } = useUser();
  const userRole = currentUser?.role || 'creator';
  const isMarketplace = userRole === 'marketplace';

  // Filter categories by role — 'both' users see everything
  const categories = userRole === 'both'
    ? allCategories
    : allCategories.filter(c => c.roles.includes(userRole));

  const taxon = activeFilter === 'all' ? undefined : activeFilter;
  const { data, isLoading } = useMCCs(taxon);

  const mccs = data?.mccs || [];
  const countByTaxon = (t: MCCTaxon) => mccs.filter(n => n.taxon === t).length;

  // On mobile: when a card is selected, show only the detail panel
  const mobileShowDetail = !!selectedMcc;

  // Role-appropriate subtitle
  const subtitle = isMarketplace
    ? 'Your project completion records, licenses, and tokens on XRPL.'
    : 'Minted Craft Credentials — your work, rights, and memberships on XRPL.';

  // Role-appropriate empty states
  function emptyText(filter: 'all' | MCCTaxon): string {
    if (filter === 'all') return 'No assets yet.';
    if (filter === 1) return isMarketplace
      ? 'No creator credentials linked to your account.'
      : 'Complete a contract milestone to earn your first credential.';
    if (filter === 2) return 'No licenses yet.';
    if (filter === 3) return 'No access tokens yet.';
    if (filter === 4) return isMarketplace
      ? 'Release an escrow to receive your first completion record.'
      : 'No client completion records issued yet.';
    return 'No assets yet.';
  }

  return (
    <>
      <TopBar title="Credential Assets" />

      {/* ── Split-panel container ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: filters + list ── */}
        <div
          className={cn(
            'flex flex-col overflow-y-auto',
            mobileShowDetail ? 'hidden lg:flex' : 'flex',
            'lg:w-[420px] lg:border-r',
          )}
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="p-5">
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>

            {/* Category filter cards — 2-col grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {categories.map(cat => {
                const Icon = cat.icon;
                const count = countByTaxon(cat.taxon);
                const isActive = activeFilter === cat.taxon;
                return (
                  <button
                    key={cat.taxon}
                    onClick={() => {
                      setActiveFilter(isActive ? 'all' : cat.taxon);
                      setSelectedMcc(null);
                    }}
                    className={cn('card text-left transition-all hover:shadow-md border p-3', isActive && 'ring-1')}
                    style={{
                      borderColor: isActive ? cat.colorVar : 'var(--border)',
                      boxShadow: isActive ? `0 0 0 1px ${cat.colorVar}22` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon size={18} strokeWidth={1.8} style={{ color: cat.colorVar, filter: radianFilter(cat.colorVar) }} />
                      {count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: cat.colorBgVar, color: cat.colorVar }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text)' }}>{cat.label}</p>
                    {cat.canCreate && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="mt-2 text-[10px] font-medium flex items-center gap-0.5 cursor-pointer"
                        style={{ color: cat.colorVar }}
                        onClick={e => { e.stopPropagation(); alert(`${cat.createLabel} — coming soon`); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); alert(`${cat.createLabel} — coming soon`); } }}
                      >
                        <Plus size={10} /> {cat.createLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* List header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {activeFilter === 'all'
                  ? `All Assets · ${mccs.length}`
                  : `${allCategories.find(c => c.taxon === activeFilter)?.label} · ${mccs.length}`}
              </h2>
              {activeFilter !== 'all' && (
                <button onClick={() => { setActiveFilter('all'); setSelectedMcc(null); }}
                  className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Show all
                </button>
              )}
            </div>

            {/* MCCRow list */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
                ))}
              </div>
            ) : mccs.length > 0 ? (
              <div className="space-y-2">
                {mccs.map(mcc => (
                  <div key={mcc.id} onClick={() => setSelectedMcc(mcc)}
                    className="rounded-xl transition-all cursor-pointer"
                    style={selectedMcc?.id === mcc.id
                      ? { outline: '1px solid var(--accent-purple)' }
                      : undefined}>
                    <MCCRow mcc={mcc} onClick={() => setSelectedMcc(mcc)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
                {emptyText(activeFilter)}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: credential detail ── */}
        <div
          className={cn(
            'flex-1',
            mobileShowDetail ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
          )}
          style={{ backgroundColor: 'var(--bg)', overflowY: 'auto', minHeight: 0 }}
        >
          {selectedMcc ? (
            <div className="p-5 max-w-lg mx-auto w-full pb-12">
              <button
                className="lg:hidden flex items-center gap-1 text-xs mb-4"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setSelectedMcc(null)}
              >
                <ChevronLeft size={14} /> Back to list
              </button>
              <MCCCard mcc={selectedMcc} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: isMarketplace ? 'rgba(96,165,250,0.12)' : 'var(--accent-purple-bg)' }}>
                {isMarketplace
                  ? <BadgeCheck size={28} style={{ color: '#60A5FA' }} />
                  : <Award size={28} style={{ color: 'var(--accent-purple)' }} />
                }
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                {isMarketplace ? 'Select a record' : 'Select a credential'}
              </p>
              <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                {isMarketplace
                  ? 'Click any row on the left to view the full token — project details, payment proof, and on-chain verification.'
                  : 'Click any row on the left to view the full token — deliverable preview, smart contract data, on-chain attributes, and XRPL explorer link.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
