'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface RevisionRequestFormProps {
  milestoneTitle: string;
  milestoneId: string;
  onSubmit: (data: {
    content: string;
    issues: string[];
    severity: 'minor' | 'major' | 'critical';
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function RevisionRequestForm({
  milestoneTitle,
  milestoneId,
  onSubmit,
  onCancel,
  isSubmitting,
}: RevisionRequestFormProps) {
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical'>('minor');
  const [issues, setIssues] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');

  const handleAddIssue = () => {
    if (issues.length < 10) {
      setIssues([...issues, '']);
    }
  };

  const handleRemoveIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index));
  };

  const handleIssueChange = (index: number, value: string) => {
    const updated = [...issues];
    updated[index] = value;
    setIssues(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validIssues = issues.filter((issue) => issue.trim());
    if (validIssues.length === 0 || !notes.trim()) return;
    onSubmit({
      severity,
      issues: validIssues,
      content: notes.trim(),
    });
  };

  const validCount = issues.filter(i => i.trim()).length;
  const canSubmit = validCount > 0 && notes.trim().length > 0 && !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Request Changes</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Milestone: {milestoneTitle}
        </p>
      </div>

      {/* Request level — dropdown */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Request level</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as 'minor' | 'major' | 'critical')}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)',
            border: '1px solid var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <option value="minor">Minor — Small adjustments, core work acceptable</option>
          <option value="major">Major — Significant changes, key requirements not met</option>
          <option value="critical">Critical — Fundamental issues, substantial rework needed</option>
        </select>
      </div>

      {/* Criteria found — issue list */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Criteria found {validCount > 0 && <span>({validCount})</span>}
        </label>
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={issue}
                onChange={(e) => handleIssueChange(index, e.target.value)}
                placeholder={`Issue ${index + 1}...`}
                maxLength={200}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text)',
                  border: '1px solid var(--text-muted)',
                }}
              />
              {issues.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveIssue(index)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {issues.length < 10 && (
          <button
            type="button"
            onClick={handleAddIssue}
            className="mt-2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            style={{
              color: 'var(--accent-blue)',
              border: '1px solid var(--accent-blue)',
              background: 'rgba(77, 138, 255, 0.08)',
            }}
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Details</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain what needs to change..."
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)',
            border: '1px solid var(--text-muted)',
          }}
        />
        {notes.length > 1500 && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{notes.length}/2000</p>
        )}
      </div>

      {/* Info line */}
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        This moves the milestone back to in progress for the creator to address.
      </p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 rounded-xl text-sm font-medium"
          style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-2 px-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: canSubmit ? '#7f3ac6' : 'var(--bg-elevated)',
            color: canSubmit ? '#fff' : 'var(--text-muted)',
            border: canSubmit ? '1px solid #7f3ac6' : '1px solid var(--border)',
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
