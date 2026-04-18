// ============================================
// useUser — Authenticated User Profile Hook
// ============================================
// Fetches and caches the current user's profile.
// Falls back to demo data when the API is unavailable (no Supabase configured).

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { demoUser } from '@/lib/demo-data';
import type { User } from '@/types';

async function fetchUser(): Promise<User> {
  const res = await fetch('/api/user/profile');

  if (!res.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const data = await res.json();
  return data.user;
}

export function useUser() {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      try {
        const user = await fetchUser();
        setUser(user);
        return user;
      } catch {
        // Fallback to demo data when API unavailable (dev without Supabase)
        setUser(demoUser);
        return demoUser;
      }
    },
    staleTime: 0, // Always re-fetch on mount (dev user switching needs fresh data)
    retry: false, // Don't retry on 401 — just fall back to demo
  });
}
