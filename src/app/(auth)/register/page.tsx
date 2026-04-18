'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If no ?step=details, redirect to /login (single auth page)
  useEffect(() => {
    if (searchParams.get('step') !== 'details') {
      router.replace('/login');
    }
  }, [searchParams, router]);

  const [form, setForm] = useState({
    displayName: '',
    role: 'both' as 'creator' | 'marketplace' | 'both',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCompleteRegistration() {
    setError(null);
    if (!form.displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setError('No authenticated user found.');
        return;
      }
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: user.user.id,
          email: user.user.email,
          display_name: form.displayName.trim(),
          xrpl_address: null,
          role: form.role,
          skills: [],
          payout_config: {},
        }]);
      if (dbError) {
        setError(dbError.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // Only show the profile completion form
  if (searchParams.get('step') !== 'details') {
    return <div className="card max-w-md text-center p-8 text-gray-500">Redirecting...</div>;
  }

  return (
    <div className="card max-w-md">
      <h2 className="text-2xl font-bold text-white mb-2">Complete your profile</h2>
      <p className="text-gray-400 text-sm mb-6">Just a couple more details to get started</p>
      <form onSubmit={(e) => { e.preventDefault(); handleCompleteRegistration(); }} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
          <input id="displayName" type="text" value={form.displayName}
            onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
            className="input w-full" placeholder="Your name or alias" required />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">What&apos;s your primary role?</label>
          <select id="role" value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as 'creator' | 'marketplace' | 'both' }))}
            className="input w-full">
            <option value="creator">Creator (I offer services)</option>
            <option value="marketplace">Marketplace Buyer (I buy work)</option>
            <option value="both">Both (I do both)</option>
          </select>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card max-w-md text-center p-8 text-gray-500">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
