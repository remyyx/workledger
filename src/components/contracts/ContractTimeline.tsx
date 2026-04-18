'use client';

import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ContractMessage, MessageType } from '@/types';
import {
  MessageCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  AlertTriangle,
  Zap,
  FilePlus,
  Mail,
} from 'lucide-react';

interface ContractTimelineProps {
  messages: ContractMessage[];
  currentUserId: string;
  isLoading: boolean;
}

// Helper to group messages by date
function groupMessagesByDate(messages: ContractMessage[]): Record<string, ContractMessage[]> {
  const grouped: Record<string, ContractMessage[]> = {};

  messages.forEach((msg) => {
    const date = new Date(msg.created_at);
    let dateKey: string;

    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMM d, yyyy');
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(msg);
  });

  return grouped;
}

// Helper to get icon for message type
function getMessageIcon(type: MessageType) {
  switch (type) {
    case 'contract_created':
      return <FilePlus size={16} />;
    case 'invitation_sent':
      return <Mail size={16} />;
    case 'revision_request':
      return <AlertTriangle size={16} />;
    case 'deliverable_submit':
      return <FileText size={16} />;
    case 'approval':
      return <CheckCircle size={16} />;
    case 'release':
      return <Zap size={16} />;
    case 'dispute_open':
      return <AlertCircle size={16} />;
    case 'deadline_warning':
      return <Clock size={16} />;
    case 'escalation':
      return <AlertTriangle size={16} />;
    default:
      return <MessageCircle size={16} />;
  }
}

// Helper to get color classes for message type
function getMessageTypeClasses(type: MessageType): {
  border: string;
  bg: string;
  icon: string;
} {
  switch (type) {
    case 'contract_created':
      return {
        border: 'border-l-4 border-l-violet-500',
        bg: 'bg-violet-500/10',
        icon: 'text-violet-400',
      };
    case 'invitation_sent':
      return {
        border: 'border-l-4 border-l-sky-500',
        bg: 'bg-sky-500/10',
        icon: 'text-sky-400',
      };
    case 'revision_request':
      return {
        border: 'border-l-4 border-l-amber-500',
        bg: 'bg-amber-500/10',
        icon: 'text-amber-500',
      };
    case 'deliverable_submit':
      return {
        border: 'border-l-4 border-l-cyan-500',
        bg: 'bg-cyan-500/10',
        icon: 'text-cyan-500',
      };
    case 'approval':
      return {
        border: 'border-l-4 border-l-green-500',
        bg: 'bg-green-500/10',
        icon: 'text-green-500',
      };
    case 'release':
      return {
        border: 'border-l-4 border-l-orange-500',
        bg: 'bg-orange-500/10',
        icon: 'text-orange-500',
      };
    case 'dispute_open':
      return {
        border: 'border-l-4 border-l-red-500',
        bg: 'bg-red-500/10',
        icon: 'text-red-500',
      };
    case 'deadline_warning':
      return {
        border: 'border-l-4 border-l-yellow-500',
        bg: 'bg-yellow-500/10',
        icon: 'text-yellow-500',
      };
    case 'escalation':
      return {
        border: 'border-l-4 border-l-red-500',
        bg: 'bg-red-500/10',
        icon: 'text-red-500',
      };
    default:
      return {
        border: '',
        bg: '',
        icon: 'text-gray-500',
      };
  }
}

// Contract created component
function ContractCreatedMessage({ message }: { message: ContractMessage }) {
  const typeClasses = getMessageTypeClasses('contract_created');
  const meta = message.metadata as any;
  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg shrink-0')}>
          <FilePlus size={16} className={typeClasses.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text">{message.content}</p>
          {meta?.template && (
            <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
              {String(meta.template).replace(/_/g, ' ')} · {meta.totalAmount?.toLocaleString()} {meta.currency}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted mt-2">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Invitation sent component
function InvitationSentMessage({ message }: { message: ContractMessage }) {
  const typeClasses = getMessageTypeClasses('invitation_sent');
  const meta = message.metadata as any;
  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg shrink-0')}>
          <Mail size={16} className={typeClasses.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text">{message.content}</p>
          {meta?.pending_invite && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              They will be linked when they sign up.
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted mt-2">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// System message component
function SystemMessage({ message }: { message: ContractMessage }) {
  const typeClasses = getMessageTypeClasses(message.type);

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <div className={cn('p-2 rounded-lg', typeClasses.bg)}>
        <div className={typeClasses.icon}>{getMessageIcon(message.type)}</div>
      </div>
      <p className="text-sm text-text-secondary">{message.content}</p>
      <span className="text-xs text-text-muted">{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
    </div>
  );
}

// Regular chat message component
function ChatMessage({ message, isOwn }: { message: ContractMessage; isOwn: boolean }) {
  const sender = message.sender;
  const initials = sender?.display_name
    ? sender.display_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-xs font-medium text-white">
          {initials}
        </div>
      </div>

      {/* Bubble */}
      <div className={cn('max-w-xs', isOwn && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-lg px-4 py-2',
          isOwn
            ? 'bg-accent-blue text-white'
            : 'bg-bg-elevated text-text',
        )}>
          <p className={cn('text-sm', isOwn ? 'text-white' : 'text-text-secondary text-xs mb-1')}>
            {sender?.display_name || 'Unknown'}
          </p>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="text-xs text-text-muted mt-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// Revision request component
function RevisionRequestMessage({ message }: { message: ContractMessage }) {
  const metadata = message.metadata as any;
  const typeClasses = getMessageTypeClasses('revision_request');

  const severityColors = {
    minor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    major: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg mt-0.5')}>
          <AlertTriangle size={16} className={typeClasses.icon} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text mb-1">Revisions Requested</p>
          <span className={cn('inline-block px-2 py-1 rounded text-xs font-medium border', severityColors[(metadata?.severity as keyof typeof severityColors) || 'major'])}>
            {metadata?.severity?.toUpperCase() || 'MAJOR'}
          </span>
        </div>
      </div>

      {metadata?.issues && metadata.issues.length > 0 && (
        <div className="mb-3 ml-8">
          <p className="text-xs font-medium text-text-secondary mb-2">Issues:</p>
          <ul className="space-y-1">
            {metadata.issues.map((issue: string, idx: number) => (
              <li key={idx} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-text-muted mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {metadata?.requested_changes && (
        <div className="ml-8">
          <p className="text-xs font-medium text-text-secondary mb-1">Changes needed:</p>
          <p className="text-sm text-text-secondary">{metadata.requested_changes}</p>
        </div>
      )}

      <p className="text-xs text-text-muted mt-3">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Deliverable submit component
function DeliverableSubmitMessage({ message }: { message: ContractMessage }) {
  const metadata = message.metadata as any;
  const typeClasses = getMessageTypeClasses('deliverable_submit');

  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg mt-0.5')}>
          <FileText size={16} className={typeClasses.icon} />
        </div>
        <p className="font-medium text-text">Deliverable Submitted</p>
      </div>

      {metadata?.media_url && (
        <div className="mb-3 ml-8">
          <a
            href={metadata.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-blue hover:underline flex items-center gap-2"
          >
            <FileText size={14} />
            View media
          </a>
        </div>
      )}

      {metadata?.doc_url && (
        <div className="mb-3 ml-8">
          <a
            href={metadata.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-blue hover:underline flex items-center gap-2"
          >
            <FileText size={14} />
            View document
          </a>
        </div>
      )}

      {metadata?.media_hash && (
        <div className="mb-3 ml-8">
          <p className="text-xs font-mono text-text-muted break-all">
            Media: {metadata.media_hash.slice(0, 24)}...
          </p>
        </div>
      )}

      {metadata?.doc_hash && (
        <div className="mb-3 ml-8">
          <p className="text-xs font-mono text-text-muted break-all">
            Doc: {metadata.doc_hash.slice(0, 24)}...
          </p>
        </div>
      )}

      {metadata?.notes && (
        <div className="ml-8 mb-3">
          <p className="text-sm text-text-secondary">{metadata.notes}</p>
        </div>
      )}

      <p className="text-xs text-text-muted mt-3">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Approval component
function ApprovalMessage({ message }: { message: ContractMessage }) {
  const typeClasses = getMessageTypeClasses('approval');

  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg')}>
          <CheckCircle size={16} className={typeClasses.icon} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text">Work Approved</p>
          <p className="text-sm text-text-secondary">Ready for payment release</p>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-3">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Release component
function ReleaseMessage({ message }: { message: ContractMessage }) {
  const metadata = message.metadata as any;
  const typeClasses = getMessageTypeClasses('release');

  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg')}>
          <Zap size={16} className={typeClasses.icon} />
        </div>
        <p className="font-medium text-text">Funds Released</p>
      </div>

      <div className="ml-8 space-y-2">
        {metadata?.amount && metadata?.currency && (
          <p className="text-sm font-medium text-text">
            {metadata.amount} {metadata.currency}
          </p>
        )}
        {metadata?.tx_hash && (
          <p className="text-xs font-mono text-text-muted break-all">
            Tx: {metadata.tx_hash.slice(0, 20)}...
          </p>
        )}
      </div>

      <p className="text-xs text-text-muted mt-3">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Dispute component
function DisputeMessage({ message }: { message: ContractMessage }) {
  const typeClasses = getMessageTypeClasses('dispute_open');

  return (
    <div className={cn('card', typeClasses.border, typeClasses.bg, 'border')}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg mt-0.5')}>
          <AlertCircle size={16} className={typeClasses.icon} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text">Dispute Opened</p>
          <p className="text-sm text-text-secondary mt-1">{message.content}</p>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-3">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// Main timeline component
export default function ContractTimeline({
  messages,
  currentUserId,
  isLoading,
}: ContractTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const grouped = groupMessagesByDate(messages);
  const hasUnread = messages.some((m) => !m.read_by.includes(currentUserId));
  const firstUnreadIndex = messages.findIndex((m) => !m.read_by.includes(currentUserId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-blue"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageCircle size={40} className="text-text-muted mb-3" />
        <p className="text-text-secondary">No activity yet. Messages and contract events will appear here.</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex flex-col gap-4 overflow-y-auto h-[420px] pr-3"
    >
      {Object.entries(grouped).map(([dateKey, dateMessages]) => (
        <div key={dateKey}>
          {/* Date separator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-text-muted uppercase">{dateKey}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Messages for this date */}
          <div className="space-y-3">
            {dateMessages.map((message, idx) => {
              const isUnreadBoundary = hasUnread && messages.indexOf(message) === firstUnreadIndex;

              return (
                <div key={message.id}>
                  {/* Unread divider */}
                  {isUnreadBoundary && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-accent-blue/30" />
                      <span className="text-xs font-medium text-accent-blue">UNREAD</span>
                      <div className="flex-1 h-px bg-accent-blue/30" />
                    </div>
                  )}

                  {/* Message renderer */}
                  {message.type === 'contract_created' ? (
                    <ContractCreatedMessage message={message} />
                  ) : message.type === 'invitation_sent' ? (
                    <InvitationSentMessage message={message} />
                  ) : message.type === 'system' ? (
                    <SystemMessage message={message} />
                  ) : message.type === 'message' ? (
                    <ChatMessage
                      message={message}
                      isOwn={message.sender_id === currentUserId}
                    />
                  ) : message.type === 'revision_request' ? (
                    <RevisionRequestMessage message={message} />
                  ) : message.type === 'deliverable_submit' ? (
                    <DeliverableSubmitMessage message={message} />
                  ) : message.type === 'approval' ? (
                    <ApprovalMessage message={message} />
                  ) : message.type === 'release' ? (
                    <ReleaseMessage message={message} />
                  ) : message.type === 'dispute_open' ? (
                    <DisputeMessage message={message} />
                  ) : message.type === 'deadline_warning' || message.type === 'escalation' ? (
                    <SystemMessage message={message} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
