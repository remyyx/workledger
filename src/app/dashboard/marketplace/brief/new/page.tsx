'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import { useUser } from '@/hooks/use-user';

const CATEGORIES = [
  'design', 'development', 'music', 'video', 'writing', 'consulting', 'other',
];

const TEMPLATES = [
  { value: 'milestone', label: 'Milestone', desc: 'Pay per deliverable — most popular' },
  { value: 'fixed_price', label: 'Fixed Price', desc: 'Single payment on completion' },
  { value: 'retainer', label: 'Retainer', desc: 'Monthly recurring engagement' },
];

export default function NewBriefPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('design');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [template, setTemplate] = useState('milestone');

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 15) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          skills_required: skills,
          budget_min: budgetMin ? parseFloat(budgetMin) : null,
          budget_max: budgetMax ? parseFloat(budgetMax) : null,
          currency: 'RLUSD',
          deadline: deadline || null,
          template,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create brief');

      router.push('/dashboard/marketplace');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopBar title="Post a Project" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">

        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Post a Project Brief</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Describe your project and let creators come to you with proposals.
          </p>

          {error && (
            <div className="rounded-lg p-3 mb-4 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Project Title</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="e.g. Brand Identity Design for Web3 Startup"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} required rows={5}
                placeholder="Describe what you need, deliverables expected, and any requirements..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Category + Template */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Category</label>
                <select
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Contract Type</label>
                <select
                  value={template} onChange={(e) => setTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Skills Required</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text" value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <button type="button" onClick={addSkill} className="p-2 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <Plus size={16} />
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                      {s}
                      <button type="button" onClick={() => setSkills(skills.filter(sk => sk !== s))}
                        className="hover:opacity-70"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Budget Min (RLUSD)</label>
                <input
                  type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Optional" min="0" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Budget Max (RLUSD)</label>
                <input
                  type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Optional" min="0" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Desired Completion Date</label>
              <input
                type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
            >
              {loading ? 'Posting...' : 'Post Project Brief'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
