'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/setup/confirmed';

    if (!code) {
      router.replace('/setup?error=verification_failed');
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('Auth callback error:', error.message);
        router.replace('/setup?error=verification_failed');
      } else {
        router.replace(next);
      }
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <p className="font-sans text-sm text-cream-200 opacity-60">Verifying…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
