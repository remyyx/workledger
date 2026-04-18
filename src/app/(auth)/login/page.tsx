'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, AlertCircle, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Redirect target — set when auth succeeds
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Redirect after successful auth
  useEffect(() => {
    if (redirectTo) {
      const timer = setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [redirectTo]);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
      // If no error, OAuth provider will handle the redirect
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setEmailLoading(false);
        return;
      }
      setRedirectTo('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Sign in failed.');
      setEmailLoading(false);
    }
  }

  return (
    <div className="card max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Welcome to StudioLedger</h1>
        <p style={{ color: 'var(--text-muted)' }}>Sign in or create your account</p>
      </div>

      {error && (
        <div className="rounded-lg p-3 mb-6 flex gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Google OAuth — Phase 1 */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text)' }}
        >
          <Mail className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {/* Email + Password — For virtual testers */}
      <form onSubmit={handleEmailSignIn} className="mb-6">
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
          Virtual testers &amp; email sign-in
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border mb-3 text-[15px] outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border mb-3 text-[15px] outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        <button
          type="submit"
          disabled={emailLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--escrow-bg)', color: 'var(--escrow)' }}
        >
          <LogIn className="w-4 h-4" />
          {emailLoading ? 'Signing in…' : 'Sign in with email'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        New accounts: Use Google to sign up
      </p>
      <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        By continuing, you agree to our Terms and Privacy Policy
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card max-w-md text-center p-8 text-gray-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
