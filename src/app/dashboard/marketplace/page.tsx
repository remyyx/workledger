'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Plus, Briefcase, Users, Clock,
  DollarSign, ChevronRight, Send, FileText, MessageSquare,
  ArrowUpRight, Tag,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import CreatorCard from '@/components/marketplace/CreatorCard';
import { useUser } from '@/hooks/use-user';
import type { ProjectBrief, Proposal } from '@/types';

// --- Categories ---
const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'music', label: 'Music & Audio' },
  { value: 'video', label: 'Video & Film' },
  { value: 'writing', label: 'Writing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

// --- Brief Card (CR sees these in "Find Work") ---
function BriefCard({ brief }: { brief: ProjectBrief }) {
  const budgetLabel = brief.budget_min && brief.budget_max
    ? `${brief.budget_min.toLocaleString()} – ${brief.budget_max.toLocaleString()} ${brief.currency}`
    : brief.budget_max
      ? `Up to ${brief.budget_max.toLocaleString()} ${brief.currency}`
      : brief.budget_min
        ? `From ${brief.budget_min.toLocaleString()} ${brief.currency}`
        : 'Budget flexible';

  const deadlineLabel = brief.deadline
    ? new Date(brief.deadline).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Flexible';

  return (
    <Link
      href={`/dashboard/marketplace/brief/${brief.id}`}
      className="block rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] group"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] truncate group-hover:text-blue-400 transition-colors" style={{ color: 'var(--text)' }}>
            {brief.title}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {brief.author?.display_name || 'Anonymous'}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
          {brief.template.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
        {brief.description}
      </p>

      {/* Skills */}
      {brief.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {brief.skills_required.slice(0, 5).map((skill) => (
            <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {skill}
            </span>
          ))}
          {brief.skills_required.length > 5 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
              +{brief.skills_required.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          <DollarSign size={12} /> {budgetLabel}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {deadlineLabel}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} /> {brief.proposals_count} proposal{brief.proposals_count !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}

// --- Proposal Card (both CR and MK see their active negotiations) ---
function ProposalCard({ proposal, isMarketmaker }: { proposal: Proposal; isMarketmaker: boolean }) {
  const other = isMarketmaker ? proposal.creator : proposal.marketplace;
  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'var(--escrow-bg)', text: 'var(--escrow)' },
    countered: { bg: 'var(--accent-blue-bg)', text: 'var(--accent-blue)' },
    accepted: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    declined: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    withdrawn: { bg: 'rgba(107,114,128,0.1)', text: 'rgb(107,114,128)' },
  };
  const statusStyle = statusColors[proposal.status] || statusColors.pending;

  return (
    <Link
      href={`/dashboard/marketplace/proposal/${proposal.id}`}
      className="block rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] group"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] truncate group-hover:text-blue-400 transition-colors" style={{ color: 'var(--text)' }}>
            {proposal.latest_terms?.title || 'Untitled Proposal'}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {isMarketmaker ? 'Creator' : 'Client'}: {other?.display_name || 'Unknown'}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
          {proposal.status === 'countered' ? `Round ${proposal.current_round}` : proposal.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        {proposal.latest_terms && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} /> {proposal.latest_terms.total_amount.toLocaleString()} {proposal.latest_terms.currency}
          </span>
        )}
        <span className="flex items-center gap-1">
          <FileText size={12} /> {proposal.current_round} round{proposal.current_round > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          {proposal.direction === 'cr_to_mk'
            ? <><ArrowUpRight size={12} /> Proposal</>
            : <><Send size={12} /> Direct offer</>}
        </span>
      </div>
    </Link>
  );
}

// --- My Briefs (MK sees their posted briefs) ---
function MyBriefCard({ brief }: { brief: ProjectBrief }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    in_negotiation: { bg: 'var(--escrow-bg)', text: 'var(--escrow)' },
    filled: { bg: 'var(--accent-blue-bg)', text: 'var(--accent-blue)' },
    cancelled: { bg: 'rgba(107,114,128,0.1)', text: 'rgb(107,114,128)' },
  };
  const statusStyle = statusColors[brief.status] || statusColors.open;

  return (
    <Link
      href={`/dashboard/marketplace/brief/${brief.id}`}
      className="block rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] group"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-[15px] truncate group-hover:text-blue-400 transition-colors" style={{ color: 'var(--text)' }}>
          {brief.title}
        </h3>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
          {brief.status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} /> {brief.proposals_count} proposal{brief.proposals_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Tag size={12} /> {brief.category}
        </span>
      </div>
    </Link>
  );
}

// ==========================================================
// Main Marketplace Page
// ==========================================================
export default function MarketplacePage() {
  const { data: user } = useUser();
  const isMarketmaker = user?.role === 'marketplace';

  const [tab, setTab] = useState<'browse' | 'negotiations' | 'my_briefs'>(isMarketmaker ? 'my_briefs' : 'browse');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [briefs, setBriefs] = useState<ProjectBrief[]>([]);
  const [myBriefs, setMyBriefs] = useState<ProjectBrief[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Set default tab based on role
  useEffect(() => {
    if (user) {
      setTab(isMarketmaker ? 'my_briefs' : 'browse');
    }
  }, [user, isMarketmaker]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (tab === 'browse') {
          // Marketplace users browse creators; creators browse briefs
          if (isMarketmaker) {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            const res = await fetch(`/api/creators?${params}`);
            const data = await res.json();
            setCreators(data.creators || []);
          } else {
            const params = new URLSearchParams({ category });
            const res = await fetch(`/api/briefs?${params}`);
            const data = await res.json();
            setBriefs(data.briefs || []);
          }
        } else if (tab === 'my_briefs') {
          const res = await fetch('/api/briefs?mine=true');
          const data = await res.json();
          setMyBriefs(data.briefs || []);
        } else if (tab === 'negotiations') {
          const res = await fetch('/api/proposals');
          const data = await res.json();
          setProposals(data.proposals || []);
        }
      } catch (e) {
        console.error('[marketplace] fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tab, category, isMarketmaker, search]);

  // Filter by search (client-side)
  const filteredBriefs = briefs.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase())
    || b.description.toLowerCase().includes(search.toLowerCase())
    || b.skills_required.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMyBriefs = myBriefs.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase())
  );

  const activeProposals = proposals.filter(p => p.status === 'pending' || p.status === 'countered');
  const closedProposals = proposals.filter(p => p.status !== 'pending' && p.status !== 'countered');

  return (
    <>
      <TopBar title={isMarketmaker ? 'Hire Talent' : 'Find Work'} />
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">

        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {isMarketmaker ? (
            <>
              <TabButton active={tab === 'my_briefs'} onClick={() => setTab('my_briefs')} icon={<Briefcase size={14} />} label="My Projects" />
              <TabButton active={tab === 'negotiations'} onClick={() => setTab('negotiations')} icon={<MessageSquare size={14} />} label="Negotiations" count={activeProposals.length || undefined} />
              <TabButton active={tab === 'browse'} onClick={() => setTab('browse')} icon={<Users size={14} />} label="Browse Creators" />
            </>
          ) : (
            <>
              <TabButton active={tab === 'browse'} onClick={() => setTab('browse')} icon={<Briefcase size={14} />} label="Open Projects" />
              <TabButton active={tab === 'negotiations'} onClick={() => setTab('negotiations')} icon={<MessageSquare size={14} />} label="My Proposals" count={activeProposals.length || undefined} />
            </>
          )}
        </div>

        {/* Search + Actions */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={
                tab === 'browse'
                  ? (isMarketmaker ? 'Search creators by skill or name...' : 'Search projects by title, skill, or keyword...')
                  : 'Search...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Post Brief (MK) */}
          {isMarketmaker && tab === 'my_briefs' && (
            <Link
              href="/dashboard/marketplace/brief/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
            >
              <Plus size={16} /> Post a Project
            </Link>
          )}
        </div>

        {/* Category Filter (browse tab, creators only — not marketplace users) */}
        {tab === 'browse' && !isMarketmaker && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium"
                style={{
                  backgroundColor: category === cat.value ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: category === cat.value ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${category === cat.value ? 'var(--accent-blue)' : 'var(--border)'}`,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* BROWSE TAB — Open projects for CR / Creators for MK */}
            {tab === 'browse' && (
              <>
                {isMarketmaker ? (
                  // Marketplace users browse creators
                  creators.length > 0 ? (
                    <div className="grid gap-3">
                      {creators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Users size={28} />}
                      title="No creators found"
                      description="Creator profiles will appear here as they join StudioLedger. Try adjusting your search."
                    />
                  )
                ) : (
                  // Creators browse briefs
                  filteredBriefs.length > 0 ? (
                    <div className="grid gap-3">
                      {filteredBriefs.map((brief) => (
                        <BriefCard key={brief.id} brief={brief} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Briefcase size={28} />}
                      title="No open projects yet"
                      description="When marketplace buyers post project briefs, they'll appear here. Check back soon!"
                    />
                  )
                )}
              </>
            )}

            {/* MY BRIEFS TAB — MK's posted projects */}
            {tab === 'my_briefs' && (
              <>
                {filteredMyBriefs.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredMyBriefs.map((brief) => (
                      <MyBriefCard key={brief.id} brief={brief} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Briefcase size={28} />}
                    title="No project briefs yet"
                    description="Post your first project to start receiving proposals from creators."
                    action={
                      <Link
                        href="/dashboard/marketplace/brief/new"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
                      >
                        <Plus size={16} /> Post a Project
                      </Link>
                    }
                  />
                )}
              </>
            )}

            {/* NEGOTIATIONS TAB */}
            {tab === 'negotiations' && (
              <>
                {activeProposals.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Active Negotiations
                    </h3>
                    <div className="grid gap-3">
                      {activeProposals.map((p) => (
                        <ProposalCard key={p.id} proposal={p} isMarketmaker={isMarketmaker} />
                      ))}
                    </div>
                  </div>
                )}

                {closedProposals.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Past Negotiations
                    </h3>
                    <div className="grid gap-3">
                      {closedProposals.map((p) => (
                        <ProposalCard key={p.id} proposal={p} isMarketmaker={isMarketmaker} />
                      ))}
                    </div>
                  </div>
                )}

                {proposals.length === 0 && (
                  <EmptyState
                    icon={<MessageSquare size={28} />}
                    title={isMarketmaker ? 'No negotiations yet' : 'No proposals yet'}
                    description={isMarketmaker
                      ? 'When creators submit proposals on your projects, negotiations will appear here.'
                      : 'Submit a proposal on an open project to start negotiating terms.'
                    }
                    action={
                      <button
                        onClick={() => setTab('browse')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
                      >
                        <Search size={16} /> {isMarketmaker ? 'Browse Creators' : 'Browse Projects'}
                      </button>
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// --- Shared Components ---
function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
      style={{
        backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
      }}
    >
      {icon} {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
        {icon}
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{title}</h2>
      <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action}
    </div>
  );
}
