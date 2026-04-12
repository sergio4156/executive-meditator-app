import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase Auth callback handler.
 * After the user clicks the email confirmation link, Supabase redirects here
 * with a `code` query param. We exchange it for a session then redirect
 * the user to /setup/confirmed where Stripe checkout is initiated.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/setup/confirmed';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    console.error('exchangeCodeForSession error:', error.message);
  }

  // If something went wrong, send back to setup with an error flag
  return NextResponse.redirect(`${origin}/setup?error=verification_failed`);
}
