// ============================================
// Dev User Store — In-Memory (Server-Side Only)
// ============================================
// Brave (and other privacy-focused browsers) aggressively block cookies,
// which breaks the dev-user-email cookie approach.
// This module stores the current dev user email on globalThis so it
// survives Next.js HMR (Hot Module Replacement) re-evaluations.
// Without globalThis, navigating between pages in dev mode resets
// the module-level variable and loses the selected user.
//
// ONLY used when NEXT_PUBLIC_SKIP_AUTH=true in development.

// Attach to globalThis so HMR doesn't wipe it
const g = globalThis as typeof globalThis & { __devUserEmail?: string | null };

export function getDevUserEmailServer(): string | null {
  return g.__devUserEmail ?? null;
}

export function setDevUserEmailServer(email: string | null): void {
  g.__devUserEmail = email;
  console.log('[dev-user-store] Set dev user to:', email);
}
