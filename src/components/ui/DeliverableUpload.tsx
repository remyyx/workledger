'use client';

// ============================================
// DeliverableUpload — compact, scrollable modal
// ============================================

import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Hash, CheckCircle, Loader2 } from 'lucide-react';

interface DeliverableUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    mediaHash: string;
    mediaFileName: string;
    docHash?: string;
    docFileName?: string;
    notes?: string;
    mediaUrl?: string;
    docUrl?: string;
  }) => void;
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DeliverableUpload({ isOpen, onClose, onSubmit }: DeliverableUploadProps) {
  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaHash, setMediaHash] = useState<string | null>(null);
  const [hashingMedia, setHashingMedia] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docHash, setDocHash] = useState<string | null>(null);
  const [hashingDoc, setHashingDoc] = useState(false);
  const [notes, setNotes] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [mediaExempt, setMediaExempt] = useState(false);
  const [docExempt, setDocExempt] = useState(false);

  const reset = useCallback(() => {
    setMediaFile(null); setMediaHash(null); setHashingMedia(false);
    setDocFile(null); setDocHash(null); setHashingDoc(false);
    setNotes(''); setMediaUrl(''); setDocUrl('');
    setMediaExempt(false); setDocExempt(false);
  }, []);

  // Can submit if: has at least one hash OR one link
  const hasContent = !!mediaHash || !!docHash || !!mediaUrl.trim() || !!docUrl.trim();
  const canSubmit = hasContent;

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  const handleMediaChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f); setMediaHash(null); setHashingMedia(true); setMediaExempt(false);
    try { setMediaHash(await hashFile(f)); } catch { setMediaHash(null); } finally { setHashingMedia(false); }
  }, []);

  const handleDocChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocFile(f); setDocHash(null); setHashingDoc(true); setDocExempt(false);
    try { setDocHash(await hashFile(f)); } catch { setDocHash(null); } finally { setHashingDoc(false); }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      mediaHash: mediaHash || docHash || 'link-only',
      mediaFileName: mediaFile?.name || docFile?.name || 'deliverable',
      docHash: docHash || undefined,
      docFileName: docFile?.name || undefined,
      notes: notes || undefined,
      mediaUrl: mediaUrl.trim() || undefined,
      docUrl: docUrl.trim() || undefined,
    });
    reset();
  }, [canSubmit, mediaHash, docHash, mediaFile, docFile, notes, mediaUrl, docUrl, onSubmit, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
            <h3 className="font-semibold text-white text-sm">Submit Deliverable</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Notes */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you're delivering..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--text-muted)' }}
            />
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Media link</label>
              <input
                type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--text-muted)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Doc link</label>
              <input
                type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--text-muted)' }}
              />
            </div>
          </div>

          {/* File uploads — optional, for SHA-256 hashing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div
                onClick={() => mediaRef.current?.click()}
                className="border border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}
              >
                <input ref={mediaRef} type="file" onChange={handleMediaChange} className="hidden" />
                {!mediaFile ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <Upload className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-400">Media file</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-purple)' }} />
                    <span className="text-[10px] text-white truncate flex-1 text-left">{mediaFile.name}</span>
                    {hashingMedia ? <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" /> :
                     mediaHash ? <CheckCircle className="w-3 h-3 text-green-400 shrink-0" /> : null}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div
                onClick={() => docRef.current?.click()}
                className="border border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}
              >
                <input ref={docRef} type="file" onChange={handleDocChange} className="hidden" />
                {!docFile ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <FileText className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-400">Document</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-[10px] text-white truncate flex-1 text-left">{docFile.name}</span>
                    {hashingDoc ? <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" /> :
                     docHash ? <CheckCircle className="w-3 h-3 text-green-400 shrink-0" /> : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hashes — show after file upload */}
          {(mediaHash || docHash) && (
            <div className="px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-1 mb-0.5">
                <Hash className="w-3 h-3" style={{ color: 'var(--escrow)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SHA-256</span>
              </div>
              {mediaHash && (
                <code className="text-[10px] font-mono break-all block" style={{ color: 'var(--text-secondary)' }}>{mediaHash}</code>
              )}
              {docHash && docHash !== mediaHash && (
                <code className="text-[10px] font-mono break-all block mt-1" style={{ color: 'var(--text-secondary)' }}>{docHash}</code>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border shrink-0">
          <button onClick={handleClose} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: canSubmit ? 'var(--accent-purple)' : 'var(--bg-elevated)', color: canSubmit ? '#fff' : 'var(--text-muted)' }}
          >
            <Upload className="w-3 h-3" />
            Submit Work
          </button>
        </div>
      </div>
    </div>
  );
}
