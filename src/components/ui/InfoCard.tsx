'use client';

import { Info, AlertTriangle, FileText, Shield, Upload, X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';

type InfoCardVariant = 'info' | 'warning' | 'upload' | 'shield' | 'document';
type ArrowDirection = 'left' | 'right' | 'up' | 'down';

interface InfoCardCta {
  /** Label text next to the arrow */
  label: string;
  /** Arrow direction */
  direction?: ArrowDirection;
}

interface InfoCardProps {
  /** The guidance message to display */
  message: string;
  /** Optional secondary text below the message */
  detail?: string;
  /** Visual variant — determines icon and accent color */
  variant?: InfoCardVariant;
  /** Whether the user can dismiss the card */
  dismissible?: boolean;
  /** Hide the card entirely (use for conditional rendering based on state) */
  hidden?: boolean;
  /** Optional className override */
  className?: string;
  /** Optional call-to-action with directional arrow */
  cta?: InfoCardCta;
}

const VARIANT_CONFIG: Record<InfoCardVariant, {
  icon: typeof Info;
  color: string;
  bg: string;
  border: string;
}> = {
  info: {
    icon: Info,
    color: 'var(--accent-blue, #5b9eff)',
    bg: 'rgba(91, 158, 255, 0.06)',
    border: 'rgba(91, 158, 255, 0.15)',
  },
  warning: {
    icon: AlertTriangle,
    color: 'var(--accent-warm, #FB923C)',
    bg: 'rgba(251, 146, 60, 0.06)',
    border: 'rgba(251, 146, 60, 0.15)',
  },
  upload: {
    icon: Upload,
    color: 'var(--accent-cyan, #06B6D4)',
    bg: 'rgba(6, 182, 212, 0.06)',
    border: 'rgba(6, 182, 212, 0.15)',
  },
  shield: {
    icon: Shield,
    color: 'var(--escrow, #22c55e)',
    bg: 'rgba(34, 197, 94, 0.06)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  document: {
    icon: FileText,
    color: 'var(--accent-purple, #a855f7)',
    bg: 'rgba(168, 85, 247, 0.06)',
    border: 'rgba(168, 85, 247, 0.15)',
  },
};

const ARROW_ICONS: Record<ArrowDirection, typeof ArrowLeft> = {
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
};

export default function InfoCard({
  message,
  detail,
  variant = 'info',
  dismissible = false,
  hidden = false,
  className = '',
  cta,
}: InfoCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (hidden || dismissed) return null;

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`relative rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${className}`}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          size={14}
          className="mt-0.5 shrink-0"
          style={{ color: config.color }}
        />
        <div className="flex-1 min-w-0">
          <p style={{ color: 'var(--text-secondary, #c8ccd4)' }}>{message}</p>
          {detail && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary, #c8ccd4)', opacity: 0.75 }}>
              {detail}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 p-0.5 rounded-full hover:bg-white/5 transition-colors"
            aria-label="Dismiss"
          >
            <X size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {cta && (() => {
        const ArrowIcon = ARROW_ICONS[cta.direction || 'left'];
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${config.border}` }}>
            <ArrowIcon size={13} style={{ color: 'var(--accent-warm, #FB923C)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--accent-warm, #FB923C)', opacity: 0.85 }}>
              {cta.label}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
