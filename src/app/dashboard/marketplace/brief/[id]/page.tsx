'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, DollarSign, Clock, Tag, Users, MessageSquare,
  Send, Plus, Trash2, AlertCircle,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useUser } from '@/hooks/use-user';
import type { ProjectBrief, Proposal, ProposalMilestone, ProposalTerms } from '@/types';

export default function BriefDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: user } = useUser();
  const isMarketmaker = user?.role === 'marketplace';

  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch brief details via the list endpoint filtered
        // We'll use the briefs API and find the one we need
        const briefRes = await fetch(`/api/briefs?mine=true`);
        const briefData = await briefRes.json();
        const found = (briefData.briefs || []).find((b: any) => b.id === params.id);

        if (!found) {
          // Try open briefs (for CR viewing)
          const openRes = await fetch(`/api/briefs`);
          const openData = await openRes.json();
          const openFound = (openData.briefs || []).find((b: any) => b.id === params.id);
          setBrief(openFound || null);
        } else {
          setBrief(found);
        }

        // Fetch proposals for this brief
        const propRes = await fetch(`/api/proposals?brief_id=${params.id}`);
        const propData = await propRes.json();
        setProposals(propData.proposals || []);
      } catch (e) {
        console.error('[brief detail]', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <>
        <TopBar title="Project Brief" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!brief) {
    return (
      <>
        <TopBar title="Project Brief" />
        <div className="flex-1 p-6 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Brief not found</p>
        </div>
      </>
    );
  }

  const isOwner = brief.author_id === user?.id;
  const budgetLabel = brief.budget_min && brief.budget_max
    ? `${brief.budget_min.toLocaleString()} – ${brief.budget_max.toLocaleString()} ${brief.currency}`
    : brief.budget_max
      ? `Up to ${brief.budget_max.toLocaleString()} ${brief.currency}`
      : brief.budget_min
        ? `From ${brief.budget_min.toLocaleString()} ${brief.currency}`
        : 'Budget flexible';

  return (
    <>
      <TopBar title="Project Brief" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">

        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        {/* Brief Card */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{brief.title}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Posted by {brief.author?.display_name || 'Anonymous'}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: brief.status === 'open' ? 'rgba(34,197,94,0.1)' : 'var(--escrow-bg)',
                color: brief.status === 'open' ? 'rgb(34,197,94)' : 'var(--escrow)',
              }}>
              {brief.status.replace('_', ' ')}
            </span>
          </div>

          <p className="text-sm mb-5 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{brief.description}</p>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><DollarSign size={12} /> {budgetLabel}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {brief.deadline ? new Date(brief.deadline).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
            </span>
            <span className="flex items-center gap-1"><Tag size={12} /> {brief.category}</span>
            <span className="flex items-center gap-1"><MessageSquare size={12} /> {brief.proposals_count} proposal{brief.proposals_count !== 1 ? 's' : ''}</span>
          </div>

          {/* Skills */}
          {brief.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {brief.skills_required.map((skill) => (
                <span key={skill} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CR: Submit Proposal Button */}
        {!isOwner && !isMarketmaker && brief.status === 'open' && !showProposalForm && (
          <button
            onClick={() => setShowProposalForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm mb-6 transition-all hover:scale-[1.01]"
            style={{ backgroundColor: 'var(--accent-burgundy2)', color: '#fff' }}
          >
            <Send size={16} /> Submit a Proposal
          </button>
        )}

        {/* CR: Proposal Form */}
        {showProposalForm && brief.author_id && (
          <ProposalForm
            brief={brief}
            onSubmit={async (terms, message) => {
              const res = await fetch('/api/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  brief_id: brief.id,
                  counterparty_id: brief.author_id,
                  direction: 'cr_to_mk',
                  terms,
                  message,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              router.push(`/dashboard/marketplace/proposal/${data.proposal.id}`);
            }}
            onCancel={() => setShowProposalForm(false)}
          />
        )}

        {/* MK: Incoming Proposals */}
        {isOwner && proposals.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Incoming Proposals ({proposals.length})
            </h3>
            <div className="space-y-3">
              {proposals.map((p) => (
                <Link key={p.id} href={`/dashboard/marketplace/proposal/${p.id}`}
                  className="block rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {p.creator?.display_name || 'Creator'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.latest_terms ? `${p.latest_terms.total_amount.toLocaleString()} ${p.latest_terms.currency}` : 'No terms'} · Round {p.current_round}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: p.status === 'pending' ? 'var(--escrow-bg)' : 'var(--accent-blue-bg)',
                        color: p.status === 'pending' ? 'var(--escrow)' : 'var(--accent-blue)',
                      }}>
                      {p.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isOwner && proposals.length === 0 && (
          <div className="text-center py-12">
            <Users size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No proposals yet. Creators will submit proposals once they see your brief.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ==========================================================
// Proposal Submission Form (CR → Brief)
// ==========================================================
function ProposalForm({
  brief, onSubmit, onCancel,
}: {
  brief: ProjectBrief;
  onSubmit: (terms: ProposalTerms, message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(brief.title);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState(brief.budget_max?.toString() || brief.budget_min?.toString() || '');
  const [deadline, setDeadline] = useState(brief.deadline?.split('T')[0] || '');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [milestones, setMilestones] = useState<ProposalMilestone[]>([
    { sequence: 1, title: 'Milestone 1', description: '', amount: 0, deadline: deadline || new Date().toISOString().split('T')[0] },
  ]);

  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones([...milestones, {
      sequence: milestones.length + 1,
      title: `Milestone ${milestones.length + 1}`,
      description: '',
      amount: 0,
      deadline: deadline || new Date().toISOString().split('T')[0],
    }]);
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index).map((m, i) => ({ ...m, sequence: i + 1 })));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const terms: ProposalTerms = {
        template: brief.template as any,
        title,
        description: description || brief.description,
        currency: brief.currency,
        total_amount: parseFloat(totalAmount),
        milestones: milestones.map((m, i) => ({ ...m, sequence: i + 1, amount: parseFloat(m.amount as any) || 0 })),
        deadline: deadline || null,
        notes,
      };
      await onSubmit(terms, message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-elevated)', border: '2px solid var(--accent-burgundy2)' }}>
      <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>Submit Your Proposal</h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Define your terms, milestones, and price. The client can accept, counter, or decline.
      </p>

      {error && (
        <div className="rounded-lg p-3 mb-4 flex items-center gap-2 text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Project Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Your Approach</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Describe how you'd approach this project, your methodology, and relevant experience..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Your Price ({brief.currency})</label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required min="0" step="0.01"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Delivery Deadline</label>
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
                <input type="text" value={m.title} onChange={(e) => {
                  const u = [...milestones]; u[i] = { ...u[i], title: e.target.value }; setMilestones(u);
                }} placeholder={`Milestone ${i + 1}`} required
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="number" value={m.amount || ''} onChange={(e) => {
                  const u = [...milestones]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setMilestones(u);
                }} placeholder="Amount" required min="0" step="0.01"
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="date" value={typeof m.deadline === 'string' ? m.deadline.split('T')[0] : ''} onChange={(e) => {
                  const u = [...milestones]; u[i] = { ...u[i], deadline: e.target.value }; setMilestones(u);
                }} required
                  className="px-2 py-2 rounded-lg text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button type="button" onClick={() => removeMilestone(i)} disabled={milestones.length <= 1}
                  className="p-1.5 rounded-lg disabled:opacity-20" style={{ color: 'rgb(239,68,68)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cover Letter */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Cover Letter</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Introduce yourself and explain why you're a great fit for this project..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-burgundy2)', color: '#fff' }}>
            <Send size={16} /> {loading ? 'Submitting...' : 'Submit Proposal'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-3 rounded-xl font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
