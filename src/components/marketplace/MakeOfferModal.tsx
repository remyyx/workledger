'use client';

import { useState } from 'react';
import { X, Loader } from 'lucide-react';

interface MakeOfferModalProps {
  creator: {
    id: string;
    display_name: string;
  };
  onClose: () => void;
}

const CURRENCIES = ['XRP', 'RLUSD', 'USD', 'EUR', 'AUD'];

export default function MakeOfferModal({ creator, onClose }: MakeOfferModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'RLUSD',
    deadline: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.title.trim()) {
        setError('Project title is required');
        setLoading(false);
        return;
      }
      if (!formData.description.trim() || formData.description.trim().length < 10) {
        setError('Description must be at least 10 characters');
        setLoading(false);
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('Valid amount required');
        setLoading(false);
        return;
      }

      const totalAmount = parseFloat(formData.amount);

      // Submit to proposals API (direct offer = MK→CR)
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_id: null,
          counterparty_id: creator.id,
          direction: 'mk_to_cr',
          terms: {
            template: 'fixed_price',
            title: formData.title,
            description: formData.description,
            currency: formData.currency,
            total_amount: totalAmount,
            deadline: formData.deadline || null,
            milestones: [{
              sequence: 1,
              title: formData.title,
              description: formData.description,
              amount: totalAmount,
              deadline: formData.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            }],
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit offer');
      }

      const data = await res.json();

      // Success — redirect to negotiation or close modal
      if (data.proposal?.id) {
        // Close modal and optionally redirect
        onClose();
        // Could redirect to the proposal detail page
        window.location.href = `/dashboard/marketplace/proposal/${data.proposal.id}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit offer';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            Make an Offer to {creator.display_name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <X size={20} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label
              className="text-sm font-medium block mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Project Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Website Redesign"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="text-sm font-medium block mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Project Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the project, deliverables, and any specific requirements..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              disabled={loading}
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label
                className="text-sm font-medium block mb-1.5"
                style={{ color: 'var(--text)' }}
              >
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                disabled={loading}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium block mb-1.5"
                style={{ color: 'var(--text)' }}
              >
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                disabled={loading}
              >
                {CURRENCIES.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label
              className="text-sm font-medium block mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Deadline (optional)
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text)',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={14} className="animate-spin" /> Sending...
                </>
              ) : (
                'Send Offer'
              )}
            </button>
          </div>
        </form>

        {/* Note */}
        <p
          className="text-xs mt-4 pt-4"
          style={{
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border)',
          }}
        >
          The creator will receive your offer and can negotiate terms, accept, or decline.
        </p>
      </div>
    </div>
  );
}
