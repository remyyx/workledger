'use client';

// ─────────────────────────────────────────────────────────────────
// LicenseTermsEditor
//
// Inline editor for contract license_terms with document upload.
// Flow:
//  1. Read-only display  — pencil or Upload doc to enter edit mode
//  2. Upload .txt / .rtf / .md → parse & auto-fill fields
//  3. Scratch box shows the FULL original document "as is"
//     (raw text, never saved, always open after upload)
//  4. Edit form — review / correct pre-filled values → Save
//  5. PATCH /api/contracts/[id] persists only the 9 LicenseTerms fields
// ─────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import {
  Pencil, X, Check, Loader2, Upload, ClipboardCopy, FileText, Printer,
} from 'lucide-react';
import type { LicenseTerms } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  contractId: string;
  licenseTerms: LicenseTerms | null;
  onSaved: (updated: LicenseTerms) => void;
  canEdit?: boolean;
}

const EMPTY: LicenseTerms = {
  rights: '',
  territory: '',
  duration: '',
  exclusivity: 'non-exclusive',
  modifications_allowed: false,
  sublicensing: false,
  transferable: false,
  royalty_percent: 0,
  revocation_conditions: '',
};

// ─── RTF → clean readable text (structure-preserving) ─────────────
function rtfToReadable(rtf: string): string {
  let s = rtf;
  // Section/heading breaks
  s = s.replace(/\\par[d]?/gi, '\n');
  s = s.replace(/\\line/gi, '\n');
  s = s.replace(/\\page/gi, '\n\n---\n\n');
  s = s.replace(/\\tab/gi, '    ');
  // Escaped braces
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  // Remove all RTF control words / sequences
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  // Remove group delimiters
  s = s.replace(/[{}]/g, '');
  // Normalise line endings
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[ \t]+\n/g, '\n');
  // Collapse 3+ blank lines → 2
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

// ─── Read file → { raw, readable } ────────────────────────────────
async function readDoc(file: File): Promise<{ raw: string; readable: string }> {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.rtf')) {
    return { raw: text, readable: rtfToReadable(text) };
  }
  return { raw: text, readable: text };
}

// ─── Multi-line section extraction ────────────────────────────────
//
// Scans the readable text for "Label: value" patterns, collecting
// everything up to the next label or blank line as the value.
// Then applies keyword heuristics for boolean fields.
//
function extractFields(readable: string): { fields: Partial<LicenseTerms>; count: number } {
  const fields: Partial<LicenseTerms> = {};
  let count = 0;

  // ── 1. Build a label → value map from the document ──
  //    Matches lines like  "Rights: Sync + Master" or "TERRITORY : Worldwide"
  const labelMap: Record<string, string> = {};
  const lines = readable.split('\n');

  let currentKey: string | null = null;
  let currentVal: string[] = [];

  const flush = () => {
    if (currentKey) {
      labelMap[currentKey.toLowerCase().trim()] = currentVal.join(' ').replace(/\s+/g, ' ').trim();
    }
    currentKey = null;
    currentVal = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }

    // Does this line start a new label?
    const m = line.match(/^([A-Za-z][A-Za-z\s\/]{1,40}?)\s*[:\-–]\s*(.*)$/);
    if (m) {
      flush();
      currentKey = m[1].trim();
      if (m[2].trim()) currentVal = [m[2].trim()];
    } else if (currentKey) {
      // Continuation of current value
      currentVal.push(line);
    }
  }
  flush();

  // ── 2. Map known aliases → LicenseTerms fields ──
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = labelMap[k.toLowerCase()];
      if (v && v !== '—' && v !== '-') return v;
    }
    return undefined;
  };

  const rights = pick('rights', 'rights granted', 'license type', 'usage rights',
                      'scope of rights', 'type of license', 'grant', 'license scope');
  if (rights) { fields.rights = rights; count++; }

  const territory = pick('territory', 'territories', 'region', 'geographic scope',
                         'geographic territory', 'coverage');
  if (territory) {
    fields.territory = territory; count++;
  } else if (/worldwide|global|all territories|all countries|international/i.test(readable)) {
    fields.territory = 'Worldwide'; count++;
  }

  const duration = pick('duration', 'term', 'license term', 'period', 'license period',
                        'contract duration', 'agreement term', 'validity', 'valid for');
  if (duration) {
    fields.duration = duration; count++;
  } else {
    const perp = /perpetual|indefinite|no\s+expir|unlimited\s+time/i.test(readable);
    if (perp) { fields.duration = 'Perpetual'; count++; }
  }

  const excl = pick('exclusivity', 'exclusive', 'exclusivity type', 'license exclusivity');
  if (excl) {
    fields.exclusivity = /non[\s\-]exclusive/i.test(excl) ? 'non-exclusive' : 'exclusive';
    count++;
  } else if (/non[\s\-]exclusive/i.test(readable)) {
    fields.exclusivity = 'non-exclusive'; count++;
  } else if (/\bexclusive\b/i.test(readable)) {
    fields.exclusivity = 'exclusive'; count++;
  }

  // Royalty — try label map first, then inline pattern
  const royLabel = pick('royalty', 'royalty rate', 'royalty %', 'royalty percent',
                        'royalties', 'royalty percentage');
  if (royLabel) {
    const pct = royLabel.match(/(\d+(?:\.\d+)?)\s*%?/);
    if (pct) { fields.royalty_percent = parseFloat(pct[1]); count++; }
  } else {
    const pct = readable.match(/royalt(?:y|ies)\s*[:\-–]?\s*(\d+(?:\.\d+)?)\s*%/i)
             || readable.match(/(\d+(?:\.\d+)?)\s*%\s*royalt/i);
    if (pct) { fields.royalty_percent = parseFloat(pct[1]); count++; }
  }

  const rev = pick('revocation', 'revocation conditions', 'termination', 'termination clause',
                   'revocation clause', 'cancellation conditions', 'grounds for revocation');
  if (rev) { fields.revocation_conditions = rev; count++; }

  // ── 3. Boolean fields: check label map value first, then keyword scan ──

  // modifications_allowed
  const modLabel = pick('modifications', 'modifications allowed', 'derivative works',
                        'modification rights', 'adaptations', 'modifiable');
  if (modLabel) {
    fields.modifications_allowed = /yes|allowed|permitted|granted|true|ok/i.test(modLabel);
    count++;
  } else if (/modifications?\s+(?:are\s+)?(?:allowed|permitted|granted)/i.test(readable)
          || /derivative\s+works?\s+(?:are\s+)?(?:allowed|permitted)/i.test(readable)) {
    fields.modifications_allowed = true; count++;
  } else if (/no\s+modifications?/i.test(readable)
          || /modifications?\s+(?:are\s+)?not\s+(?:allowed|permitted)/i.test(readable)) {
    fields.modifications_allowed = false; count++;
  }

  // sublicensing
  const subLabel = pick('sublicensing', 'sub-licensing', 'sublicense', 'sub license');
  if (subLabel) {
    fields.sublicensing = /yes|allowed|permitted|granted|true|ok/i.test(subLabel);
    count++;
  } else if (/sublicens(?:ing|e)\s+(?:is\s+)?(?:allowed|permitted|granted)/i.test(readable)
          || /(?:may|can)\s+sublicens/i.test(readable)) {
    fields.sublicensing = true; count++;
  } else if (/no\s+sublicens/i.test(readable)
          || /sublicens(?:ing|e)\s+(?:is\s+)?not\s+(?:allowed|permitted)/i.test(readable)) {
    fields.sublicensing = false; count++;
  }

  // transferable
  const trLabel = pick('transferable', 'transferability', 'assignable', 'assignability');
  if (trLabel) {
    const isNeg = /non[\s\-]transferable|not\s+transferable|non[\s\-]assignable|not\s+assignable/i.test(trLabel);
    fields.transferable = !isNeg; count++;
  } else if (/non[\s\-]transferable|not\s+transferable/i.test(readable)) {
    fields.transferable = false; count++;
  } else if (/\btransferable\b|\bassignable\b/i.test(readable)) {
    fields.transferable = true; count++;
  }

  return { fields, count };
}

// ─── Component ────────────────────────────────────────────────────
export default function LicenseTermsEditor({ contractId, licenseTerms, onSaved, canEdit = true }: Props) {
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [form, setForm]               = useState<LicenseTerms>(licenseTerms ?? EMPTY);
  // scratch: { raw = original file text, view: 'raw'|'readable' }
  const [scratch, setScratch]         = useState<{ raw: string; readable: string } | null>(null);
  const [scratchView, setScratchView] = useState<'raw' | 'readable'>('readable');
  const [parseInfo, setParseInfo]     = useState<string | null>(null);
  const [parsing, setParsing]         = useState(false);
  const [copied, setCopied]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    setForm(licenseTerms ?? EMPTY);
    setError(null);
    setParseInfo(null);
    setScratch(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
    setScratch(null);
    setParseInfo(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target as HTMLInputElement;
    input.value = '';
    if (!file) return;

    const lower = file.name.toLowerCase();
    const ok = ['.txt', '.rtf', '.md', '.markdown', '.csv', '.log', '.text'];
    if (!ok.some(ext => lower.endsWith(ext))) {
      setError('Unsupported type. Use .txt, .rtf or .md');
      return;
    }

    setParsing(true);
    setError(null);
    setParseInfo(null);

    try {
      const { raw, readable } = await readDoc(file);
      const { fields, count } = extractFields(readable);

      // Merge extracted fields into form (over EMPTY base, or over existing values)
      setForm(prev => ({ ...prev, ...fields }));

      setScratch({ raw, readable });
      setScratchView('readable');    // default to readable view

      setParseInfo(
        count > 0
          ? `${count} field${count !== 1 ? 's' : ''} pre-filled from "${file.name}"`
          : `Couldn't detect structured fields — check the scratch box and fill manually`
      );

      if (!editing) setEditing(true);
    } catch (err: any) {
      setError(`Read error: ${err?.message || 'unknown'}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Include the source document text so it persists in the metadata card
      const payload = scratch
        ? { ...form, source_doc: scratch.readable || scratch.raw }
        : form;
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_terms: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      onSaved(form);
      setScratch(null);
      setParseInfo(null);
      setEditing(false);
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyScratch = () => {
    const text = scratchView === 'raw' ? scratch?.raw : scratch?.readable;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const printScratch = () => {
    const text = scratchView === 'raw' ? scratch?.raw : scratch?.readable;
    if (!text) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Document Capture — License Terms</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      line-height: 1.8;
      color: #111;
      background: #fff;
      padding: 2.5cm 3cm;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0.4cm;
      padding-bottom: 0.3cm;
      border-bottom: 1px solid #aaa;
      color: #222;
    }
    .meta {
      font-size: 9pt;
      color: #666;
      margin-bottom: 0.8cm;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 10.5pt;
    }
    @media print {
      body { padding: 1.5cm 2cm; }
      @page { margin: 1.5cm 2cm; }
    }
  </style>
</head>
<body>
  <h1>Document Capture — License Terms</h1>
  <p class="meta">Printed ${new Date().toLocaleString()} · View: ${scratchView}</p>
  <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const setField = (k: keyof LicenseTerms, v: any) =>
    setForm(f => ({ ...f, [k]: v }));

  const inputCls = 'w-full rounded-lg px-3 py-1.5 text-sm bg-transparent border focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]';
  const inputSty = { borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg-surface)' };

  // ── Read-only rows ──
  const lt = licenseTerms;
  const readRows = [
    { label: 'Rights',        value: lt?.rights        || '—' },
    { label: 'Territory',     value: lt?.territory     || '—' },
    { label: 'Duration',      value: lt?.duration      || '—' },
    { label: 'Exclusivity',   value: lt?.exclusivity   || '—' },
    { label: 'Modifications', value: lt ? (lt.modifications_allowed ? 'Allowed'     : 'Not allowed') : '—' },
    { label: 'Sublicensing',  value: lt ? (lt.sublicensing          ? 'Allowed'     : 'Not allowed') : '—' },
    { label: 'Transferable',  value: lt ? (lt.transferable          ? 'Yes'         : 'No')          : '—' },
    { label: 'Royalty',       value: (lt?.royalty_percent ?? 0) > 0 ? `${lt!.royalty_percent}%`      : '—' },
    { label: 'Revocation',    value: lt?.revocation_conditions      || '—' },
  ];

  // ── Toggle ──
  const Toggle = ({ fieldKey, label }: { fieldKey: 'modifications_allowed' | 'sublicensing' | 'transferable'; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <button
        type="button"
        onClick={() => setField(fieldKey, !form[fieldKey])}
        className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          form[fieldKey] ? 'bg-green-500' : 'bg-gray-600')}
      >
        <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
          form[fieldKey] ? 'translate-x-4' : 'translate-x-1')} />
      </button>
    </div>
  );

  // ── Scratch box display text ──
  const scratchText = scratchView === 'raw' ? scratch?.raw : scratch?.readable;
  const scratchLineCount = (scratchText ?? '').split('\n').length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          License Terms
        </p>
        {canEdit && (
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <input ref={fileRef} type="file" accept=".txt,.rtf,.md,.markdown,.log,.text" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={parsing}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ color: 'var(--accent-fund)', border: '1px solid var(--accent-fund)', opacity: 0.85 }}
                >
                  {parsing ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {parsing ? 'Reading…' : 'Upload doc'}
                </button>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                  style={{ color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', opacity: 0.7 }}
                >
                  <Pencil size={11} /> Edit
                </button>
              </>
            )}
            {editing && (
              <>
                <input type="file" id="lt-upload-edit" accept=".txt,.rtf,.md,.markdown,.log,.text" className="hidden" onChange={handleFileChange} />
                <label htmlFor="lt-upload-edit"
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-90"
                  style={{ color: 'var(--accent-fund)', border: '1px solid var(--accent-fund)', opacity: 0.85 }}
                >
                  {parsing ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {parsing ? 'Reading…' : 'Re-upload'}
                </label>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <X size={11} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded disabled:opacity-50"
                  style={{ color: '#0A0A0A', backgroundColor: '#22c55e', border: 'none' }}>
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Parse feedback banner ── */}
      {parseInfo && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
          style={{ backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', color: '#86efac' }}>
          <FileText size={11} />
          {parseInfo}
        </div>
      )}

      {/* ── Error ── */}
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {/* ── Read-only display ── */}
      {!editing && (
        <div className="space-y-2 text-sm">
          {readRows.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-right capitalize" style={{ color: value === '—' ? 'var(--text-muted)' : 'var(--text)' }}>
                {value}
              </span>
            </div>
          ))}
          {!lt && canEdit && (
            <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
              No license terms set. Upload a doc or click Edit.
            </p>
          )}
        </div>
      )}

      {/* ── Edit form ── */}
      {editing && (
        <div className="space-y-3">

          {/* ─ Text fields ─ */}
          {([
            { key: 'rights',    label: 'Rights',    ph: 'e.g. Sync + Master, Publishing…' },
            { key: 'territory', label: 'Territory', ph: 'e.g. Worldwide, US only…' },
            { key: 'duration',  label: 'Duration',  ph: 'e.g. Perpetual, 2 years from release…' },
          ] as const).map(({ key, label, ph }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input type="text" value={(form[key] as string) ?? ''} onChange={e => setField(key, e.target.value)}
                className={inputCls} style={inputSty} placeholder={ph} />
            </div>
          ))}

          {/* ─ Exclusivity ─ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Exclusivity</label>
            <select value={form.exclusivity} onChange={e => setField('exclusivity', e.target.value as LicenseTerms['exclusivity'])}
              className={inputCls} style={{ ...inputSty, cursor: 'pointer' }}>
              <option value="non-exclusive" style={{ backgroundColor: '#1a1a1a' }}>Non-exclusive</option>
              <option value="exclusive"     style={{ backgroundColor: '#1a1a1a' }}>Exclusive</option>
            </select>
          </div>

          {/* ─ Royalty % ─ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Royalty %</label>
            <input type="number" min={0} max={100} step={0.01}
              value={form.royalty_percent ?? 0} onChange={e => setField('royalty_percent', parseFloat(e.target.value) || 0)}
              className={inputCls} style={inputSty} placeholder="0" />
          </div>

          {/* ─ Revocation conditions ─ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Revocation Conditions</label>
            <textarea value={form.revocation_conditions ?? ''} onChange={e => setField('revocation_conditions', e.target.value)}
              rows={3} className={inputCls + ' resize-none'} style={inputSty}
              placeholder="e.g. License may be revoked if payment terms are breached…" />
          </div>

          {/* ─ Boolean toggles ─ */}
          <div className="rounded-lg px-3 py-0.5" style={{ border: '1px solid var(--border)' }}>
            <Toggle fieldKey="modifications_allowed" label="Modifications Allowed" />
            <div style={{ borderTop: '1px solid var(--separator)' }}><Toggle fieldKey="sublicensing"  label="Sublicensing" /></div>
            <div style={{ borderTop: '1px solid var(--separator)' }}><Toggle fieldKey="transferable"  label="Transferable" /></div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              DOCUMENT CAPTURE — full content, never saved
          ───────────────────────────────────────────────────────── */}
          {scratch && (
            <div className="mt-3 rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>

              {/* Header bar */}
              <div className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    <FileText size={11} /> Document capture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                    {(scratchText ?? '').split('\n').length} lines · not saved
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Raw / Readable toggle */}
                  <div className="flex rounded overflow-hidden text-[10px]" style={{ border: '1px solid var(--border)' }}>
                    {(['readable', 'raw'] as const).map(v => (
                      <button key={v} onClick={() => setScratchView(v)}
                        className="px-2 py-0.5 capitalize transition-colors"
                        style={{
                          backgroundColor: scratchView === v ? 'rgba(255,255,255,0.12)' : 'transparent',
                          color: scratchView === v ? 'var(--text)' : 'var(--text-muted)',
                        }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  {/* Copy all */}
                  <button onClick={copyScratch}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-90"
                    style={{ color: copied ? '#86efac' : 'var(--accent-blue)', border: '1px solid currentColor', opacity: 0.8 }}>
                    <ClipboardCopy size={10} />
                    {copied ? 'Copied!' : 'Copy all'}
                  </button>
                  {/* Print */}
                  <button onClick={printScratch}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-90"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', opacity: 0.8 }}>
                    <Printer size={10} />
                    Print
                  </button>
                </div>
              </div>

              {/* Full document — no height cap, natural length */}
              <pre
                className="w-full font-mono text-[11px] px-4 py-4 whitespace-pre-wrap break-words select-text"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.75, userSelect: 'text' }}
              >
                {scratchText}
              </pre>
            </div>
          )}

          {/* Inline error at form bottom */}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
