'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Lock, Award, ChevronRight, X } from 'lucide-react';

const STORAGE_KEY = 'studioledger_onboarding_dismissed';

export default function OnboardingStrip() {
  const [dismissed, setDismissed] = useState(true); // start true to avoid flash

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  const steps = [
    {
      label: 'Create a contract',
      description: 'Set scope, milestones, and payment',
      href: '/dashboard/contracts/new',
      icon: FileText,
    },
    {
      label: 'Client funds escrow',
      description: 'Funds lock on XRPL until you deliver',
      icon: Lock,
    },
    {
      label: 'Deliver & get paid + MCC',
      description: 'Approve release, earn credential',
      href: '/dashboard/contracts',
      icon: Award,
    },
  ];

  return (
    <div
      className="rounded-2xl p-4 relative animate-fade-in-stagger"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss onboarding"
      >
        <X size={16} />
      </button>

      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        Get started
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const content = (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--escrow-bg)', color: 'var(--escrow)' }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {step.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {step.description}
                </p>
              </div>
              {step.href && (
                <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
          );
          return step.href ? (
            <Link key={i} href={step.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
