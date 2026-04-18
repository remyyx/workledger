'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Layers, RotateCcw, Info, Loader2,
  AlertCircle, Plus, Trash2, GripVertical, ChevronRight, ChevronLeft, Clock, Calendar
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { PLATFORM, CURRENCIES } from '@/config/constants';
import { calculatePlatformFee } from '@/lib/fees';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

const templates = [
  { id: 'fixed_price', label: 'Fixed Price', icon: FileText, available: true, description: 'Single deliverable, one payment' },
  { id: 'milestone', label: 'Milestone', icon: Layers, available: true, description: 'Multiple deliverables, staged payments' },
  { id: 'retainer', label: 'Retainer', icon: RotateCcw, available: true, description: 'Recurring monthly payments' },
];

interface MilestoneItem {
  title: string;
  description: string;
  amount: string;
  deadline: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const { data: currentUser } = useUser();
  const isMarketplaceUser = currentUser?.role === 'marketplace';
  const counterpartyLabel = isMarketplaceUser ? 'Creator Email' : 'Marketplace Buyer Email';
  const counterpartyPlaceholder = isMarketplaceUser ? 'creator@example.com' : 'buyer@example.com';
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState('fixed_price');
  const [form, setForm] = useState({
    title: '',
    description: '',
    marketplaceEmail: '',
    currency: 'RLUSD',
    amount: '',
    deadline: '',
  });
  const [milestones, setMilestones] = useState<MilestoneItem[]>([
    { title: 'Milestone 1', description: '', amount: '', deadline: '' },
    { title: 'Milestone 2', description: '', amount: '', deadline: '' },
  ]);
  const [retainer, setRetainer] = useState({
    monthlyAmount: '',
    startDate: '',
    durationMonths: '0', // 0 = ongoing
    hoursPerMonth: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  function updateMilestone(index: number, field: keyof MilestoneItem, value: string) {
    setMilestones((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
    if (error) setError(null);
  }

  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones((prev) => [...prev, { title: `Milestone ${prev.length + 1}`, description: '', amount: '', deadline: '' }]);
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 2) return;
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function splitEvenly() {
    const total = milestoneSum;
    if (total <= 0 || milestones.length === 0) return;
    const perMs = (total / milestones.length).toFixed(2);
    const remainder = (total - parseFloat(perMs) * (milestones.length - 1)).toFixed(2);
    setMilestones((prev) => prev.map((m, i) => ({
      ...m,
      amount: i === prev.length - 1 ? remainder : perMs,
    })));
  }

  function updateRetainer(field: string, value: string) {
    setRetainer((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  const isMilestone = template === 'milestone';
  const isRetainer = template === 'retainer';
  const milestoneSum = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const retainerMonthly = parseFloat(retainer.monthlyAmount) || 0;
  const retainerDuration = parseInt(retainer.durationMonths) || 0;
  const retainerTotal = retainerDuration > 0 ? retainerMonthly * retainerDuration : retainerMonthly; // show 1 month if ongoing
  const totalAmount = isMilestone ? milestoneSum : isRetainer ? retainerTotal : (parseFloat(form.amount) || 0);
  const feeResult = calculatePlatformFee(totalAmount);
  const platformFee = parseFloat(feeResult.platformFee);
  const freelancerReceives = parseFloat(feeResult.net);

  function validateStep2(): boolean {
    if (!form.title.trim()) { setError('Contract title is required.'); return false; }
    if (!form.marketplaceEmail.trim()) { setError('Marketplace buyer email is required.'); return false; }
    if (isMilestone) {
      if (milestones.length < 2) { setError('Milestone contracts need at least 2 milestones.'); return false; }
      for (let i = 0; i < milestones.length; i++) {
        if (!milestones[i].title.trim()) { setError(`Milestone ${i + 1} needs a title.`); return false; }
        if (!milestones[i].amount || parseFloat(milestones[i].amount) <= 0) {
          setError(`Milestone ${i + 1} needs a valid amount.`); return false;
        }
      }
      if (milestoneSum <= 0) { setError('Total milestone amount must be greater than 0.'); return false; }
    } else if (isRetainer) {
      if (!retainer.monthlyAmount || retainerMonthly <= 0) { setError('Monthly amount is required.'); return false; }
      if (!retainer.startDate) { setError('Start date is required.'); return false; }
    } else {
      if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount is required.'); return false; }
      if (!form.deadline) { setError('Deadline is required.'); return false; }
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const msPayload = isMilestone
        ? milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: parseFloat(m.amount),
            deadline: m.deadline || undefined,
          }))
        : isRetainer
        ? [{
            title: `Cycle 1`,
            description: `Retainer cycle starting ${retainer.startDate}`,
            amount: retainerMonthly,
            deadline: undefined,
          }]
        : [{
            title: form.title,
            description: form.description,
            amount: parseFloat(form.amount),
            deadline: form.deadline || undefined,
          }];

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          template,
          marketplaceEmail: form.marketplaceEmail,
          currency: form.currency,
          totalAmount: isRetainer ? retainerMonthly : isMilestone ? milestoneSum : parseFloat(form.amount),
          milestones: msPayload,
          ...(isRetainer && {
            retainer: {
              monthlyAmount: retainerMonthly,
              startDate: retainer.startDate,
              durationMonths: retainerDuration,
              hoursPerMonth: retainer.hoursPerMonth ? parseInt(retainer.hoursPerMonth) : undefined,
            },
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create contract.'); return; }
      setCreatedContractId(data.contract?.id || null);
      setSubmitted(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ──── Success Screen ────
  if (submitted) {
    return (
      <>
        <TopBar title="New Contract" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card text-center max-w-md">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Contract Created!</h2>
            <p className="text-gray-400 mb-6">
              Your {isRetainer ? 'retainer' : isMilestone ? 'milestone' : 'fixed price'} contract &quot;{form.title}&quot; has been created as a draft.
              {isMilestone && ` It has ${milestones.length} milestones totaling ${milestoneSum.toFixed(2)} ${form.currency}.`}
              {isRetainer && ` Monthly rate: ${retainerMonthly.toFixed(2)} ${form.currency}${retainerDuration > 0 ? ` for ${retainerDuration} months` : ' (ongoing)'}.`}
              {' '}Share the link with your client to get it funded.
            </p>
            <div className="flex gap-3 justify-center">
              {createdContractId ? (
                <Link href={`/dashboard/contracts/${createdContractId}`} className="btn-primary">View Contract</Link>
              ) : (
                <Link href="/dashboard/contracts" className="btn-primary">View Contracts</Link>
              )}
              <button
                onClick={() => {
                  setSubmitted(false); setCreatedContractId(null); setStep(1);
                  setForm({ title: '', description: '', marketplaceEmail: '', currency: 'RLUSD', amount: '', deadline: '' });
                  setMilestones([
                    { title: 'Milestone 1', description: '', amount: '', deadline: '' },
                    { title: 'Milestone 2', description: '', amount: '', deadline: '' },
                  ]);
                  setRetainer({ monthlyAmount: '', startDate: '', durationMonths: '0', hoursPerMonth: '' });
                }}
                className="btn-secondary"
              >Create Another</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="New Contract" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/dashboard/contracts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
          <ArrowLeft size={16} /> Back to contracts
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Template', 'Details', 'Review'].map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => isDone && setStep(stepNum)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                    isActive && 'bg-brand-500/20 text-brand-400 border border-brand-500/30',
                    isDone && 'text-green-400 cursor-pointer hover:bg-green-500/10',
                    !isActive && !isDone && 'text-gray-600'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                    isActive && 'bg-brand-500 text-white',
                    isDone && 'bg-green-500 text-white',
                    !isActive && !isDone && 'bg-surface-alt text-gray-500'
                  )}>
                    {isDone ? '✓' : stepNum}
                  </span>
                  {label}
                </button>
                {i < 2 && <ChevronRight size={14} className="text-gray-700" />}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* ──── STEP 1: Template ──── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Choose Template</h2>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {templates.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => { if (t.available) { setTemplate(t.id); setError(null); } }}
                    disabled={!t.available}
                    className={cn(
                      'card text-center transition-all relative',
                      template === t.id && t.available ? 'border-brand-500 ring-2 ring-brand-500/30' : '',
                      !t.available && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                    {!t.available && (
                      <span className="absolute top-2 right-2 text-[10px] bg-surface-alt text-gray-500 border border-border px-1.5 py-0.5 rounded">Soon</span>
                    )}
                  </button>
                );
              })}
            </div>

            {template === 'milestone' && (
              <div className="card border-brand-500/30 mb-6">
                <div className="flex items-start gap-3">
                  <Layers size={20} className="text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">How Milestone Contracts Work</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Split your project into stages. Each milestone has its own escrow on XRPL.
                      The client funds the first two milestones upfront (buffer system), then funds the
                      next one when they approve the current delivery. Both sides are always protected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {template === 'retainer' && (
              <div className="card border-purple-500/30 mb-6">
                <div className="flex items-start gap-3">
                  <RotateCcw size={20} className="text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">How Retainer Contracts Work</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Set a monthly rate and the buyer funds each cycle in advance on XRPL.
                      Each escrow uses a <strong className="text-purple-300">FinishAfter</strong> time-gate — funds can only
                      be released after the billing period ends. If the creator delivers, funds release
                      automatically. If not, the buyer can cancel after a 14-day grace period.
                      Guaranteed income for creators, guaranteed commitment for buyers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2">
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ──── STEP 2: Details ──── */}
        {step === 2 && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Contract Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contract Title</label>
                <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)}
                  className="input" placeholder="E-Commerce Platform Redesign" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)}
                  className="input min-h-[80px] resize-y" placeholder="Describe the scope of work..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{counterpartyLabel}</label>
                  <input type="email" value={form.marketplaceEmail} onChange={(e) => updateField('marketplaceEmail', e.target.value)}
                    className="input" placeholder={counterpartyPlaceholder} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)} className="input">
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.icon} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fixed Price fields */}
              {!isMilestone && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                    <input type="number" value={form.amount} onChange={(e) => updateField('amount', e.target.value)}
                      className="input" placeholder="1500" min="1" step="0.01" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Deadline</label>
                    <input type="date" value={form.deadline} onChange={(e) => updateField('deadline', e.target.value)}
                      className="input" required />
                  </div>
                </div>
              )}

              {/* Milestone Builder */}
              {isMilestone && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-300">Milestones</label>
                    <div className="flex items-center gap-2">
                      {milestoneSum > 0 && (
                        <button type="button" onClick={splitEvenly}
                          className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded border border-brand-500/30 hover:bg-brand-500/10 transition-all">
                          Split evenly
                        </button>
                      )}
                      <button type="button" onClick={addMilestone} disabled={milestones.length >= 10}
                        className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded border border-brand-500/30 hover:bg-brand-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {milestones.map((m, idx) => (
                      <div key={idx} className="card p-4 border-border/50">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1 pt-2 text-gray-600">
                            <GripVertical size={14} />
                            <span className="text-xs font-bold w-4">{idx + 1}</span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-[1fr_160px] gap-3">
                              <input type="text" value={m.title} onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                                className="input text-sm" placeholder={`Milestone ${idx + 1} title`} />
                              <input type="number" value={m.amount} onChange={(e) => updateMilestone(idx, 'amount', e.target.value)}
                                className="input text-sm" placeholder="Amount" min="0" step="0.01"
                                style={{ border: '1px solid var(--text-muted)' }} />
                            </div>
                            <div className="grid grid-cols-[1fr_160px] gap-3">
                              <input type="text" value={m.description} onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                                className="input text-sm" placeholder="Brief description (optional)" />
                              <input type="date" value={m.deadline} onChange={(e) => updateMilestone(idx, 'deadline', e.target.value)}
                                className="input text-sm" />
                            </div>
                          </div>
                          <button type="button" onClick={() => removeMilestone(idx)} disabled={milestones.length <= 2}
                            className="mt-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between px-2">
                    <span className="text-xs text-gray-500">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''} (max 10)</span>
                    <span className={cn('text-sm font-semibold', milestoneSum > 0 ? 'text-white' : 'text-gray-600')}>
                      Total: {milestoneSum.toFixed(2)} {form.currency}
                    </span>
                  </div>
                </div>
              )}

              {/* Retainer fields */}
              {isRetainer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Monthly Amount</label>
                      <input type="number" value={retainer.monthlyAmount} onChange={(e) => updateRetainer('monthlyAmount', e.target.value)}
                        className="input" placeholder="2000" min="1" step="0.01" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                      <input type="date" value={retainer.startDate} onChange={(e) => updateRetainer('startDate', e.target.value)}
                        className="input" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Duration</label>
                      <select value={retainer.durationMonths} onChange={(e) => updateRetainer('durationMonths', e.target.value)} className="input">
                        <option value="0">Ongoing (until cancelled)</option>
                        <option value="1">1 month</option>
                        <option value="3">3 months</option>
                        <option value="6">6 months</option>
                        <option value="12">12 months</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Hours/Month <span className="text-gray-500">(optional)</span></label>
                      <input type="number" value={retainer.hoursPerMonth} onChange={(e) => updateRetainer('hoursPerMonth', e.target.value)}
                        className="input" placeholder="40" min="1" step="1" />
                    </div>
                  </div>
                  {retainerMonthly > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-purple-400" />
                        <span className="text-xs font-medium text-purple-400">Billing Cycle</span>
                      </div>
                      <p className="text-xs text-purple-300/70">
                        {retainerMonthly.toFixed(2)} {form.currency}/month
                        {retainerDuration > 0 ? ` × ${retainerDuration} months = ${retainerTotal.toFixed(2)} ${form.currency} total` : ' — ongoing until either party cancels'}
                        {retainer.hoursPerMonth ? ` · ${retainer.hoursPerMonth} hours/month agreed` : ''}
                      </p>
                      <p className="text-xs text-purple-300/50 mt-1">
                        Each cycle uses a time-gated XRPL escrow. FinishAfter = cycle end, CancelAfter = +14 days grace.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Fee Breakdown */}
              {totalAmount > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-green-400" />
                    <span className="text-sm font-medium text-green-400">Fee Breakdown</span>
                  </div>
                  <div className="space-y-1 text-sm text-green-300/80">
                    <div className="flex justify-between">
                      <span>Contract Amount</span>
                      <span>{totalAmount.toFixed(2)} {form.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee ({PLATFORM.FEE_PERCENT}%)</span>
                      <span>-{platformFee.toFixed(2)} {form.currency}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-green-500/30 pt-1 mt-1 text-green-400">
                      <span>You Receive</span>
                      <span>{freelancerReceives.toFixed(2)} {form.currency}</span>
                    </div>
                    {isMilestone && (
                      <p className="text-xs text-green-300/60 mt-1">Fee deducted per-milestone on each release</p>
                    )}
                    {isRetainer && (
                      <p className="text-xs text-green-300/60 mt-1">
                        Fee deducted per-cycle ({retainerMonthly > 0 ? (retainerMonthly * PLATFORM.FEE_PERCENT / 100).toFixed(2) : '0'} {form.currency}/month)
                        {retainerDuration === 0 && ' — ongoing'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => { if (validateStep2()) setStep(3); }}
                className="btn-primary flex items-center gap-2">
                Review <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ──── STEP 3: Review ──── */}
        {step === 3 && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Review Contract</h2>

            <div className="card mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{form.title}</h3>
                  {form.description && <p className="text-sm text-gray-400 mt-1">{form.description}</p>}
                </div>
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full border font-medium',
                  isMilestone ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : isRetainer ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                )}>
                  {isMilestone ? 'Milestone' : isRetainer ? 'Retainer' : 'Fixed Price'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{isMarketplaceUser ? 'Creator' : 'Marketplace Buyer'}</span>
                  <p className="text-white">{form.marketplaceEmail}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="text-white font-semibold">{totalAmount.toFixed(2)} {form.currency}</p>
                </div>
                <div>
                  <span className="text-gray-500">Platform Fee</span>
                  <p className="text-yellow-400">{platformFee.toFixed(2)} {form.currency} ({PLATFORM.FEE_PERCENT}%)</p>
                </div>
                <div>
                  <span className="text-gray-500">You Receive</span>
                  <p className="text-green-400 font-semibold">{freelancerReceives.toFixed(2)} {form.currency}</p>
                </div>
              </div>
            </div>

            {isMilestone && (
              <div className="card mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">{milestones.length} Milestones</h4>
                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-alt/50">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        idx < 2 ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-alt text-gray-500'
                      )}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{m.title}</span>
                        {m.description && <p className="text-xs text-gray-500 truncate">{m.description}</p>}
                      </div>
                      {m.deadline && <span className="text-xs text-gray-500">{m.deadline}</span>}
                      <span className="text-sm font-semibold text-white">{parseFloat(m.amount).toFixed(2)} {form.currency}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/20">
                  <p className="text-xs text-brand-400">
                    <strong>Buffer system:</strong> Client funds milestones 1 & 2 upfront.
                    Each approval triggers funding of the next milestone.
                  </p>
                </div>
              </div>
            )}

            {isRetainer && (
              <div className="card mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">Retainer Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Monthly Rate</span>
                    <p className="text-white font-semibold">{retainerMonthly.toFixed(2)} {form.currency}/month</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Start Date</span>
                    <p className="text-white">{retainer.startDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration</span>
                    <p className="text-white">{retainerDuration > 0 ? `${retainerDuration} months` : 'Ongoing'}</p>
                  </div>
                  {retainer.hoursPerMonth && (
                    <div>
                      <span className="text-gray-500">Hours/Month</span>
                      <p className="text-white">{retainer.hoursPerMonth}h</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <p className="text-xs text-purple-400">
                    <strong>Time-gated escrow:</strong> Each cycle locks funds with FinishAfter = cycle end date.
                    Creator can release after the period ends. Buyer can cancel after 14-day grace period.
                  </p>
                </div>
              </div>
            )}

            {!isMilestone && !isRetainer && (
              <div className="card mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Deadline</span>
                    <p className="text-white">{form.deadline}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Escrow</span>
                    <p className="text-cyan-400">Single EscrowCreate on XRPL</p>
                  </div>
                </div>
              </div>
            )}

            <div className="card border-cyan-500/30 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-cyan-400">TX</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">On-Chain Actions</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {isMilestone
                      ? `Creates ${Math.min(2, milestones.length)} EscrowCreate transactions on XRPL (first 2 milestones funded upfront). Each uses a SHA-256 crypto-condition. Releasing a milestone triggers EscrowFinish + ${PLATFORM.FEE_PERCENT}% fee Payment.`
                      : isRetainer
                      ? `Creates 1 EscrowCreate per billing cycle with FinishAfter time-gate + SHA-256 condition. Funds locked until cycle end. Release triggers EscrowFinish + ${PLATFORM.FEE_PERCENT}% fee Payment + next cycle EscrowCreate.`
                      : `Creates 1 EscrowCreate on XRPL with SHA-256 crypto-condition. On approval, EscrowFinish releases funds minus ${PLATFORM.FEE_PERCENT}% platform fee.`
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Edit
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating Contract...</>
                ) : (
                  isMarketplaceUser ? 'Create Contract & Send to Creator' : 'Create Contract & Send to Client'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
