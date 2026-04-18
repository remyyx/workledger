'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import type { MessageAttachment } from '@/types';

interface MessageComposerProps {
  onSend: (content: string, attachments?: MessageAttachment[]) => void;
  isSending: boolean;
  placeholder?: string;
  milestoneId?: string | null;
}

export default function MessageComposer({
  onSend,
  isSending,
  placeholder = 'Type a message...',
  milestoneId,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [charCount, setCharCount] = useState(0);

  const MAX_CHARS = 5000;
  const CHAR_WARNING = 4000;

  // Auto-grow textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, 24),
        textareaRef.current.scrollHeight
      );
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;

    // Enforce max length
    if (value.length > MAX_CHARS) {
      value = value.slice(0, MAX_CHARS);
    }

    setContent(value);
    setCharCount(value.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter for new line, Enter to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim() || isSending) {
      return;
    }

    onSend(content.trim());
    setContent('');
    setCharCount(0);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Focus back
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const isDisabled = !content.trim() || isSending;
  const showCharCount = charCount > CHAR_WARNING;
  const charCountColor = charCount >= MAX_CHARS ? 'text-red-500' : 'text-text-muted';

  return (
    <div className="border-t border-border p-4 bg-bg-surface">
      <div className="flex gap-3 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSending}
            maxLength={MAX_CHARS}
            rows={1}
            className={cn(
              'input resize-none min-h-[40px] max-h-[144px]',
              'placeholder-text-muted',
              'bg-bg-elevated border border-border',
              'focus:ring-2 focus:ring-accent-blue',
              isSending && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              height: '40px',
              lineHeight: '1.5rem',
            }}
          />

          {/* Character count */}
          {showCharCount && (
            <div className={cn('absolute bottom-2 right-3 text-xs font-medium', charCountColor)}>
              {charCount}/{MAX_CHARS}
            </div>
          )}
        </div>

        {/* Attachment button */}
        <button
          title="File attachments coming soon"
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200',
            'bg-bg-elevated border border-border',
            'hover:bg-bg-inset hover:border-border',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          disabled={true}
        >
          <Paperclip size={18} className="text-text-secondary" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isDisabled}
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200',
            'font-medium',
            !isDisabled
              ? 'bg-accent-blue text-white hover:opacity-90 active:scale-95'
              : 'bg-bg-elevated text-text-muted cursor-not-allowed opacity-50'
          )}
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-text-muted mt-2">
        <span className="text-accent-blue">Shift + Enter</span> for new line, <span className="text-accent-blue">Enter</span> to send
      </p>
    </div>
  );
}
