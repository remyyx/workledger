'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Star,
  Briefcase,
  Award,
  Copy,
  Shield,
  Eye,
  EyeOff,
  CreditCard,
  Lock,
  Save,
  Camera,
  Image,
  Layers,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useUser, useDashboardStats, useMCCs } from '@/hooks';
import { useWalletStore } from '@/stores/wallet-store';
import { truncateAddress, cn } from '@/lib/utils';

/* ── Privacy Toggle ─────────────────────────────────────── */
function PrivacySwitch({ isPublic, onToggle }: { isPublic: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 shrink-0 border"
      style={
        isPublic
          ? { backgroundColor: 'var(--status-active-bg)', color: 'var(--status-active)', borderColor: 'var(--status-active)' }
          : { backgroundColor: 'var(--hover)', color: 'var(--text-tertiary)', borderColor: 'var(--separator)' }
      }
    >
      {isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
      {isPublic ? 'Public' : 'Private'}
    </button>
  );
}

/* ── Deterministic Plate & ID from userId ───────────────── */
function generatePlateNumber(userId: string): string {
  const clean = userId.replace(/-/g, '');
  const digits = clean.replace(/[^0-9]/g, '').slice(0, 5).padEnd(5, '0');
  const letters = clean.replace(/[^A-Fa-f]/g, '').slice(0, 2).toUpperCase().padEnd(2, 'A');
  return `SLPN${digits}${letters}`;
}

function generateMemberId(userId: string): string {
  return userId.split('-')[0]?.toUpperCase() || '00000000';
}

/* ── Profile Page ───────────────────────────────────────── */
export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: mccsData } = useMCCs();
  const { displayCurrency } = useWalletStore();

  const isMarketmaker = user?.role === 'marketplace';
  const workCredentials = (mccsData?.mccs || []).filter((n) => n.taxon === 1);
  const completionRecords = (mccsData?.mccs || []).filter((n) => n.taxon === 4);
  const roleMCCs = isMarketmaker ? completionRecords : workCredentials;
  const isLoading = userLoading || statsLoading;

  // Privacy switches
  const [privacy, setPrivacy] = useState({
    businessNumber: '',
    businessNumberPublic: false,
    emailPublic: false,
    xrplAddressPublic: true,
    bioPublic: true,
    skillsPublic: true,
    payoutPublic: false,
  });

  // Image uploads — portrait, logo, and up to 4 template slides
  const [images, setImages] = useState<{
    portrait: string | null;
    logo: string | null;
    templates: string[];
  }>({ portrait: null, logo: null, templates: [] });

  const portraitRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(type: 'portrait' | 'logo', file: File) {
    const url = URL.createObjectURL(file);
    setImages((prev) => ({ ...prev, [type]: url }));
    // TODO: upload to Cloudflare R2 / Supabase Storage
  }

  function handleTemplatesUpload(files: FileList) {
    const newUrls = Array.from(files).slice(0, 4).map((f) => URL.createObjectURL(f));
    setImages((prev) => ({
      ...prev,
      templates: [...prev.templates, ...newUrls].slice(0, 4),
    }));
    // TODO: upload to Cloudflare R2 / Supabase Storage
  }

  function removeTemplate(index: number) {
    setImages((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index),
    }));
  }

  const [saved, setSaved] = useState(false);
  const [showMemberId, setShowMemberId] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSavePrivacy() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isLoading || !user) {
    return (
      <>
        <TopBar title="Profile" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </>
    );
  }

  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const plateNumber = generatePlateNumber(user.id);
  const memberId = generateMemberId(user.id);
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });

  const completedJobs = stats?.completedJobs || 0;
  const rating = 4.7;

  return (
    <>
      <TopBar title="Profile" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

          {/* ═══════════════════════════════════════════════════ */}
          {/* IDENTITY CARD — Role-Aware Showcase                 */}
          {/* ═══════════════════════════════════════════════════ */}

          <section className="relative rounded-3xl overflow-hidden animate-fade-in">
            {/* Atmospheric background */}
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, var(--escrow-bg), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, var(--accent-warm-bg), transparent)` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-surface)] to-[var(--bg-surface)]" style={{ opacity: 0.95 }} />
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] animate-glow-pulse" style={{ backgroundColor: 'var(--escrow-bg)' }} />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-[80px]" style={{ backgroundColor: 'var(--accent-warm-bg)' }} />
            <div className="absolute inset-0 border rounded-3xl pointer-events-none" style={{ borderColor: 'var(--separator)' }} />

            <div className="relative px-10 pt-10 pb-8">

              {/* ── Top: Portrait Frame + Identity ─────────── */}
              <div className="flex items-start gap-8 mb-8">

                {/* FRAME 1: Portrait */}
                <div className="relative group shrink-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-2 font-semibold text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Portrait
                  </p>
                  <button
                    onClick={() => portraitRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden ring-1 shadow-glow-md"
                    style={{ boxShadow: '0 0 0 1px var(--separator)' }}
                  >
                    <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(135deg, var(--escrow), var(--accent-purple))' }} />
                    {images.portrait ? (
                      <img src={images.portrait} alt="Portrait" className="relative w-full h-full object-cover" />
                    ) : (
                      <span className="relative flex items-center justify-center w-full h-full text-2xl font-display font-bold tracking-tight drop-shadow-lg" style={{ color: 'var(--text)' }}>
                        {initials}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                      <Camera size={24} style={{ color: 'var(--text)' }} />
                    </div>
                  </button>
                  <input
                    ref={portraitRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('portrait', e.target.files[0])}
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 shadow-glow-warm" style={{ background: 'var(--escrow)', borderColor: 'var(--bg-surface)' }} />
                </div>

                {/* Name + Role + Address + Bio + Skills */}
                <div className="flex-1 min-w-0 pt-3">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h2 className="text-4xl font-bold font-display tracking-tight leading-none" style={{ color: 'var(--text)' }}>
                      {user.display_name}
                    </h2>
                    {user.verified && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center ring-1" style={{ backgroundColor: 'var(--status-active-bg)', boxShadow: '0 0 0 1px var(--status-active)' }}>
                        <CheckCircle size={16} style={{ color: 'var(--status-active)' }} />
                      </div>
                    )}
                  </div>

                  <p className="text-sm font-display font-semibold capitalize tracking-wide mb-3" style={{ color: 'var(--accent-warm)' }}>
                    {user.role}
                  </p>

                  {/* XRPL Address chip */}
                  <button
                    onClick={() => copyToClipboard(user.xrpl_address)}
                    className="group/addr inline-flex items-center gap-2.5 backdrop-blur-sm rounded-xl px-4 py-2 border transition-all duration-200 mb-4"
                    style={{ backgroundColor: 'var(--hover)', borderColor: 'var(--separator)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-active)' }} />
                    <code className="text-[13px] font-mono tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {truncateAddress(user.xrpl_address, 8)}
                    </code>
                    <Copy
                      size={12}
                      className="transition-all duration-200"
                      style={{ color: copied ? 'var(--status-active)' : 'var(--text-tertiary)' }}
                    />
                  </button>

                  {/* Bio */}
                  {user.bio && (
                    <p className="text-[14px] leading-relaxed mb-4 max-w-xl" style={{ color: 'var(--text-muted)' }}>
                      {user.bio}
                    </p>
                  )}

                  {/* Skills */}
                  {user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-default border"
                          style={{ backgroundColor: 'var(--hover)', color: 'var(--text-muted)', borderColor: 'var(--separator)' }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Media Frames Row: Logo + Templates ─────── */}
              <div className="flex items-start gap-5 mb-8">

                {/* FRAME 2: Logo */}
                <div className="shrink-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    Logo
                  </p>
                  <button
                    onClick={() => logoRef.current?.click()}
                    className="group relative w-24 h-24 rounded-2xl border border-dashed flex items-center justify-center transition-all duration-200 overflow-hidden"
                    style={{ backgroundColor: 'var(--hover)', borderColor: 'var(--separator)' }}
                  >
                    {images.logo ? (
                      <img src={images.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                        <Image size={20} className="transition-colors duration-200" />
                        <span className="text-[9px]">Upload</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                      <Camera size={16} style={{ color: 'var(--text)' }} />
                    </div>
                  </button>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('logo', e.target.files[0])}
                  />
                </div>

                {/* FRAME 3: Templates / Slides — larger gallery */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {isMarketmaker ? 'Project Gallery' : 'Templates & Slides'}
                  </p>
                  <div className="rounded-2xl border border-dashed p-3 min-h-[120px]" style={{ borderColor: 'var(--separator)', backgroundColor: 'var(--hover)' }}>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Uploaded template thumbnails */}
                      {images.templates.map((url, i) => (
                        <div key={i} className="group/tmpl relative aspect-[4/3] rounded-xl overflow-hidden ring-1" style={{ boxShadow: '0 0 0 1px var(--separator)' }}>
                          <img src={url} alt={`Template ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeTemplate(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/tmpl:opacity-100 transition-opacity text-xs hover:opacity-90"
                            style={{ color: 'var(--text)' }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}

                      {/* Add slot — show if fewer than 4 */}
                      {images.templates.length < 4 && (
                        <button
                          onClick={() => templatesRef.current?.click()}
                          className="group aspect-[4/3] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all duration-200"
                          style={{ borderColor: 'var(--separator)', backgroundColor: 'var(--hover)' }}
                        >
                          <Layers size={18} className="mb-1 transition-colors" style={{ color: 'var(--text-tertiary)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            {images.templates.length === 0 ? 'Add work' : 'Add more'}
                          </span>
                        </button>
                      )}
                    </div>

                    {images.templates.length === 0 && (
                      <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
                        {isMarketmaker ? 'Showcase up to 4 completed projects or team highlights' : 'Showcase up to 4 templates, slides, or work samples'}
                      </p>
                    )}
                  </div>
                  <input
                    ref={templatesRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleTemplatesUpload(e.target.files)}
                  />
                </div>
              </div>

              {/* ── Bottom Bar: Reputation + Member Info ───── */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 border-t" style={{ borderColor: 'var(--separator)' }}>
                <div className="flex items-center gap-5">
                  <span className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    <Briefcase size={13} />
                    <span className="font-semibold font-display" style={{ color: 'var(--text)' }}>{completedJobs}</span>
                    <span>{isMarketmaker ? 'projects funded' : 'completed'}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    <Star size={13} style={{ color: 'var(--accent-warm)' }} />
                    <span className="font-semibold font-display" style={{ color: 'var(--text)' }}>{rating}</span>
                    <span>rating</span>
                  </span>
                  <span className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    <Award size={13} style={{ color: 'var(--escrow)' }} />
                    <span className="font-semibold font-display" style={{ color: 'var(--text)' }}>{roleMCCs.length}</span>
                    <span>{isMarketmaker ? 'completions' : 'MCCs'}</span>
                  </span>
                </div>

                <span className="ml-auto flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  <span>Member since {memberSince}</span>
                  <span className="font-mono text-[10px] tracking-[0.12em] px-2 py-0.5 rounded-md border" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--hover)', borderColor: 'var(--separator)' }}>
                    {plateNumber}
                  </span>
                </span>
              </div>

            </div>
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* PRIVATE ADMIN — Account Owner Only                 */}
          {/* ═══════════════════════════════════════════════════ */}

          <section className="relative pt-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Elegant divider */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--separator)] to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 flex items-center gap-2.5" style={{ backgroundColor: 'var(--bg)' }}>
              <Shield size={13} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-display" style={{ color: 'var(--text-tertiary)' }}>
                Private Admin
              </span>
            </div>

            {/* Edit in Settings */}
            <div className="flex justify-end mb-5">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1.5 text-[12px] transition-colors duration-200 font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Pencil size={11} />
                Edit in Settings
                <ExternalLink size={10} className="ml-0.5 opacity-50" />
              </Link>
            </div>

            <div className="space-y-4">

              {/* Membership Card */}
              <div className="card border" style={{ borderColor: 'var(--accent-warm-bg)' }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-warm-bg)' }}>
                    <CreditCard size={14} style={{ color: 'var(--accent-warm)' }} />
                  </div>
                  <h4 className="text-sm font-bold font-display tracking-tight" style={{ color: 'var(--text)' }}>
                    Membership
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* SLPN Plate Number */}
                  <div>
                    <p className="text-[10px] mb-1.5 flex items-center gap-1.5 uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      Plate Number
                      <span className="text-[9px]" style={{ color: 'var(--accent-warm)' }}>Public</span>
                    </p>
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between border" style={{ backgroundColor: 'var(--hover)', borderColor: 'var(--separator)' }}>
                      <code className="text-sm font-mono font-bold tracking-[0.1em]" style={{ color: 'var(--accent-warm)' }}>
                        {plateNumber}
                      </code>
                      <button
                        className="transition-colors duration-200"
                        style={{ color: 'var(--text-tertiary)' }}
                        onClick={() => copyToClipboard(plateNumber)}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Member ID */}
                  <div>
                    <p className="text-[10px] mb-1.5 flex items-center gap-1.5 uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      Member ID
                      <Lock size={8} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>Private</span>
                    </p>
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between border" style={{ backgroundColor: 'var(--hover)', borderColor: 'var(--separator)' }}>
                      <code className="text-sm font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {showMemberId ? memberId : '••••••••'}
                      </code>
                      <button
                        className="transition-colors duration-200"
                        style={{ color: 'var(--text-tertiary)' }}
                        onClick={() => setShowMemberId(!showMemberId)}
                      >
                        {showMemberId ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your SLPN identifies you publicly on the XRPL network. Your Member ID is private and used for account recovery.
                </p>
              </div>

              {/* Account Info */}
              <div className="card">
                <h4 className="text-sm font-bold mb-4 font-display tracking-tight" style={{ color: 'var(--text)' }}>
                  Account
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Email</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                    </div>
                    <PrivacySwitch
                      isPublic={privacy.emailPublic}
                      onToggle={() => setPrivacy((p) => ({ ...p, emailPublic: !p.emailPublic }))}
                    />
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--separator)' }} />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>XRPL Address</p>
                      <p className="text-sm font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.xrpl_address}</p>
                    </div>
                    <PrivacySwitch
                      isPublic={privacy.xrplAddressPublic}
                      onToggle={() => setPrivacy((p) => ({ ...p, xrplAddressPublic: !p.xrplAddressPublic }))}
                    />
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="card">
                <h4 className="text-sm font-bold mb-4 font-display tracking-tight" style={{ color: 'var(--text)' }}>
                  Profile Info
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Display Name</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.display_name}</p>
                    </div>
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--separator)' }} />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Bio</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.bio || '—'}</p>
                    </div>
                    <PrivacySwitch
                      isPublic={privacy.bioPublic}
                      onToggle={() => setPrivacy((p) => ({ ...p, bioPublic: !p.bioPublic }))}
                    />
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--separator)' }} />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Skills</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {user.skills.length > 0 ? user.skills.join(', ') : '—'}
                      </p>
                    </div>
                    <PrivacySwitch
                      isPublic={privacy.skillsPublic}
                      onToggle={() => setPrivacy((p) => ({ ...p, skillsPublic: !p.skillsPublic }))}
                    />
                  </div>
                </div>
              </div>

              {/* Payout & Currency */}
              <div className="card">
                <h4 className="text-sm font-bold mb-4 font-display tracking-tight" style={{ color: 'var(--text)' }}>
                  {isMarketmaker ? 'Funding & Currency' : 'Payout & Currency'}
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>{isMarketmaker ? 'Funding Strategy' : 'Payout Strategy'}</p>
                      <p className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{user.payout_config?.strategy || 'Single Currency'}</p>
                    </div>
                    <PrivacySwitch
                      isPublic={privacy.payoutPublic}
                      onToggle={() => setPrivacy((p) => ({ ...p, payoutPublic: !p.payoutPublic }))}
                    />
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--separator)' }} />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] mb-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Display Currency</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{displayCurrency}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Registration */}
              <div className="card">
                <h4 className="text-sm font-bold mb-1 font-display tracking-tight" style={{ color: 'var(--text)' }}>
                  Business Registration Number
                </h4>
                <p className="text-[11px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  ABN (Australia), EIN (US), SIRET (France), or national equivalent
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={privacy.businessNumber}
                    onChange={(e) => setPrivacy((p) => ({ ...p, businessNumber: e.target.value }))}
                    className="input flex-1"
                    placeholder="e.g. 51 824 753 556"
                  />
                  <PrivacySwitch
                    isPublic={privacy.businessNumberPublic}
                    onToggle={() => setPrivacy((p) => ({ ...p, businessNumberPublic: !p.businessNumberPublic }))}
                  />
                </div>
              </div>

              {/* Save */}
              <button onClick={handleSavePrivacy} className="btn-primary flex items-center gap-2.5">
                <Save size={15} />
                <span className="font-display font-semibold">
                  {saved ? 'Saved!' : 'Save Privacy Settings'}
                </span>
              </button>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
