import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks if Supabase isn't configured — ONLY in development
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    if (process.env.NODE_ENV === 'production') {
      // In production, missing Supabase config is a hard failure — never bypass auth
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    return response;
  }

  // Skip auth redirect in local development — allow dashboard access without login
  const isDev = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
  if (isDev && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
    });

    const { data: { session } } = await supabase.auth.getSession();
    const path = request.nextUrl.pathname;

    // Redirect unauthenticated users away from dashboard
    if (!session && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect /register to /login unless completing profile
    const isCompletingProfile = path === '/register' && request.nextUrl.searchParams.get('step') === 'details';
    if (path === '/register' && !isCompletingProfile) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users away from auth pages
    if (session && path === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    console.error('[Middleware] Auth check failed:', error);
    // In production, auth failures must not silently pass through
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
