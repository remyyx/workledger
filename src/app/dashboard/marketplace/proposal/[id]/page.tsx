'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Check, X, RotateCcw, Send, DollarSign, Clock,
  FileText, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useUser } from '@/hooks/use-user';
import type { Proposal, ProposalRound, ProposalTerms, ProposalMilestone } from '@/types';

// ==========================================================
// Proposal Negotiation Page
// ==========================================================
// Shows the full negotiation history (rounds) and allows
// counter-offers, acceptance, decline, or withdrawal.
// ==========================================================

export default function ProposalPage() {
  const params = useParams();
  const router = useRouter();
  const { data: user } = useUser();
  const isMarketmaker = user?.role === 'marketplace';

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [rounds, setRounds] = useState<ProposalRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  async function fetchProposal() {
    try {
      const res = await fetch(`/api/proposals/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProposal(data.proposal);
      setRounds(data.proposal.rounds || []);
      // Auto-expand latest round
      if (data.proposal.rounds?.length) {
        setExpandedRounds(new Set([data.proposal.rounds.length]));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProposal(); }, [params.id]);

  async function handleAction(action: string, body?: any) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === 'accept' && data.contract_id) {
        router.push(`/dashboard/contracts/${data.contract_id}`);
        return;
      }

      // Refresh
      await fetchProposal();
      setShowCounterForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Negotiation" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!proposal) {
    return (
      <>
        <TopBar title="Negotiation" />
        <div className="flex-1 p-6 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Proposal not found</p>
        </div>
      </>
    );
  }

  const isOpen = proposal.status === 'pending' || proposal.status === 'countered';
  const latestRound = rounds[rounds.length - 1];
  const isMyTurn = latestRound && latestRound.author_id !== user?.id;
  const otherParty = isMarketmaker ? proposal.creator : proposal.marketplace;

  return (
    <>
      <TopBar title="Negotiation" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">

        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        {/* Header */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {proposal.latest_terms?.title || 'Negotiation'}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                with {otherParty?.display_name || 'Unknown'} · {proposal.direction === 'cr_to_mk' ? 'Proposal' : 'Direct Offer'}
              </p>
            </div>
            <StatusBadge status={proposal.status} round={proposal.current_round} />
          </div>

          {proposal.brief && (
            <Link href={`/dashboard/marketplace/brief/${proposal.brief_id}`}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
              <FileText size={12} /> {(proposal.brief as any)?.title || 'View Brief'}
            </Link>
          )}

          {/* Turn indicator */}
          {isOpen && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{
              backgroundColor: isMyTurn ? 'var(--accent-blue-bg)' : 'var(--escrow-bg)',
              color: isMyTurn ? 'var(--accent-blue)' : 'var(--escrow)',
            }}>
              {isMyTurn
                ? 'Your turn — review the latest terms and accept, counter, or decline.'
                : `Waiting for ${otherParty?.display_name || 'the other party'} to respond.`
              }
            </div>
          )}

          {/* Accepted → go to contract */}
          {proposal.status === 'accepted' && proposal.contract_id && (
            <Link href={`/dashboard/contracts/${proposal.contract_id}`}
              className="block mt-4 p-3 rounded-xl text-sm text-center font-medium transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'rgb(34,197,94)' }}>
              Agreement reached — View Contract →
            </Link>
          )}
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Negotiation Rounds */}
        <div className="space-y-3 mb-6">
          {rounds.map((round, i) => (
            <RoundCard
              key={round.id}
              round={round}
              roundIndex={i}
              totalRounds={rounds.length}
              isExpanded={expandedRounds.has(round.round_number)}
              onToggle={() => {
                const next = new Set(expandedRounds);
                next.has(round.round_number) ? next.delete(round.round_number) : next.add(round.round_number);
                setExpandedRounds(next);
              }}
              currentUserId={user?.id || ''}
              creatorName={proposal.creator?.display_name || 'Creator'}
              marketplaceName={proposal.marketplace?.display_name || 'Client'}
            />
          ))}
        </div>

        {/* Action Buttons */}
        {isOpen && isMyTurn && !showCounterForm && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleAction('accept')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: 'rgb(34,197,94)' }}
            >
              <Check size={16} /> Accept Terms
            </button>
            <button
              onClick={() => setShowCounterForm(true)}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}
            >
              <RotateCcw size={16} /> Counter-Offer
            </button>
            <button
              onClick={() => handleAction('decline')}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}
            >
              <X size={16} /> Decline
            </button>
          </div>
        )}

        {/* Withdraw (own offer, not yet responded to) */}
        {isOpen && !isMyTurn && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => handleAction('withdraw')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-xs transition-all hover:opacity-80 disabled:opacity-50"
              style={{ color: 'var(--text-muted)' }}
            >
              Withdraw Proposal
            </button>
          </div>
        )}

        {/* Counter-Offer Form */}
        {showCounterForm && latestRound && (
          <CounterOfferForm
            previousTerms={latestRound.terms as unknown as ProposalTerms}
            onSubmit={(terms, message) => handleAction('counter', { terms, message })}
            onCancel={() => setShowCounterForm(false)}
            loading={actionLoading}
          />
        )}
      </div>
    </>
  );
}

// ==========================================================
// Sub-components
// ==========================================================

function StatusBadge({ status, round }: { status: string; round: number }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'var(--escrow-bg)', text: 'var(--escrow)' },
    countered: { bg: 'var(--accent-blue-bg)', text: 'var(--accent-blue)' },
    accepted: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    declined: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    withdrawn: { bg: 'rgba(107,114,128,0.1)', text: 'rgb(107,114,128)' },
  };
  const style = colors[status] || colors.pending;

  return (
    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
      {status === 'countered' ? `Round ${round}` : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RoundCard({
  round, roundIndex, totalRounds, isExpanded, onToggle, currentUserId, creatorName, marketplaceName,
}: {
  round: ProposalRound;
  roundIndex: number;
  totalRounds: number;
  isExpanded: boolean;
  onToggle: () => void;
  currentUserId: string;
  creatorName: string;
  marketplaceName: string;
}) {
  const terms = round.terms as unknown as ProposalTerms;
  const isYou = round.author_id === currentUserId;
  const authorLabel = isYou ? 'You' : (round.author_id === currentUserId ? creatorName : marketplaceName);
  const isLatest = roundIndex === totalRounds - 1;

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{
      backgroundColor: 'var(--bg-elevated)',
      border: isLatest ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
    }}>
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:opacity-90">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: isYou ? 'var(--accent-blue-bg)' : 'var(--escrow-bg)', color: isYou ? 'var(--accent-blue)' : 'var(--escrow)' }}>
            {round.round_number}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {roundIndex === 0 ? 'Initial Offer' : `Counter-Offer #${round.round_number - 1}`}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>by {authorLabel}</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {terms.total_amount.toLocaleString()} {terms.currency} · {terms.milestones.length} milestone{terms.milestones.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="h-px mb-4" style={{ backgroundColor: 'var(--border)' }} />

          {/* Message */}
          {round.message && (
            <div className="rounded-xl p-3 mb-4 text-sm italic" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text)' }}>
              "{round.message}"
            </div>
          )}

          {/* Terms Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>Total</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {terms.total_amount.toLocaleString()} {terms.currency}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>Type</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {terms.template.replace('_', ' ')}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>Deadline</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {terms.deadline ? new Date(terms.deadline).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Flexible'}
              </p>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Milestones</p>
            <div className="space-y-2">
              {terms.milestones.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg p-3 text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{m.title}</span>
                    {m.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{m.description}</p>}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{m.amount.toLocaleString()}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(m.deadline).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {terms.notes && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{terms.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Counter-Offer Form
// ==========================================================
function CounterOfferForm({
  previousTerms, onSubmit, onCancel, loading,
}: {
  previousTerms: ProposalTerms;
  onSubmit: (terms: ProposalTerms, message: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(previousTerms.title);
  const [description, setDescription] = useState(previousTerms.description);
  const [totalAmount, setTotalAmount] = useState(previousTerms.total_amount.toString());
  const [milestones, setMilestones] = useState<ProposalMilestone[]>(previousTerms.milestones);
  const [deadline, setDeadline] = useState(previousTerms.deadline || '');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState(previousTerms.notes || '');

  function updateMilestone(index: number, field: keyof ProposalMilestone, value: any) {
    const updated = [...milestones];
    (updated[index] as any)[field] = value;
    setMilestones(updated);
  }

  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones([...milestones, {
      sequence: milestones.length + 1,
      title: '',
      description: '',
      amount: 0,
      deadline: deadline || new Date().toISOString().split('T')[0],
    }]);
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return;
    const updated = milestones.filter((_, i) => i !== index).map((m, i) => ({ ...m, sequence: i + 1 }));
    setMilestones(updated);
  }

  function splitEvenly() {
    const total = parseFloat(totalAmount) || 0;
    if (total <= 0 || milestones.length === 0) return;
    const each = Math.floor((total / milestones.length) * 100) / 100;
    const remainder = total - each * milestones.length;
    setMilestones(milestones.map((m, i) => ({
      ...m,
      amount: i === 0 ? each + Math.round(remainder * 100) / 100 : each,
    })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const terms: ProposalTerms = {
      template: previousTerms.template,
      title,
      description,
      currency: previousTerms.currency,
      total_amount: parseFloat(totalAmount),
      milestones: milestones.map((m, i) => ({ ...m, sequence: i + 1, amount: parseFloat(m.amount as any) || 0 })),
      deadline: deadline || null,
      notes,
    };
    if (previousTerms.retainer) terms.retainer = previousTerms.retainer;
    onSubmit(terms, message);
  }

  return (
    <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-elevated)', border: '2px solid var(--accent-blue)' }}>
      <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>Counter-Offer</h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Modify the terms below. The other party will see your changes highlighted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Project Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Scope Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Total + Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Amount ({previousTerms.currency})</label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required min="0" step="0.01"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Overall Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Milestones</label>
            <div className="flex gap-2">
              <button type="button" onClick={splitEvenly} className="text-[10px] px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-blue)', border: '1px solid var(--border)' }}>
                Split evenly
              </button>
              <button type="button" onClick={addMilestone} className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                disabled={milestones.length >= 10}>
                <Plus size={10} /> Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                <input type="text" value={m.title} onChange={(e) => updateMilestone(i, 'title', e.target.value)}
                  placeholder={`Milestone ${i + 1}`} required
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="number" value={m.amount || ''} onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
                  placeholder="Amount" required min="0" step="0.01"
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="date" value={typeof m.deadline === 'string' ? m.deadline.split('T')[0] : ''} onChange={(e) => updateMilestone(i, 'deadline', e.target.value)}
                  required
                  className="px-2 py-2 rounded-lg text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button type="button" onClick={() => removeMilestone(i)} disabled={milestones.length <= 1}
                  className="p-1.5 rounded-lg disabled:opacity-20"
                  style={{ color: 'rgb(239,68,68)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Message (optional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
            placeholder="Explain your changes..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>
            <Send size={16} /> {loading ? 'Sending...' : 'Send Counter-Offer'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
