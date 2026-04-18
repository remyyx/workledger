export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error_description || error)}`,
        request.url
      )
    );
  }

  // Exchange code for session
  if (code) {
    try {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));

      // Create Supabase client that reads/writes cookies via request/response
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
              response.cookies.set({ name, value: '', ...options });
            },
          },
        }
      );

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(exchangeError.message)}`,
            request.url
          )
        );
      }

      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(new URL('/login?error=No user found', request.url));
      }

      // Check if user profile exists in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      // If user doesn't exist, redirect to complete profile
      if (!existingUser) {
        const registerResponse = NextResponse.redirect(
          new URL('/register?step=details', request.url)
        );
        // Copy session cookies to the register redirect
        response.cookies.getAll().forEach((cookie) => {
          registerResponse.cookies.set(cookie.name, cookie.value);
        });
        return registerResponse;
      }

      // User exists, redirect to dashboard (session cookies already set)
      return response;
    } catch (err) {
      console.error('Auth callback error:', err);
      return NextResponse.redirect(
        new URL(
          '/login?error=An unexpected error occurred during sign-in',
          request.url
        )
      );
    }
  }

  // No code or error
  return NextResponse.redirect(new URL('/login', request.url));
}
