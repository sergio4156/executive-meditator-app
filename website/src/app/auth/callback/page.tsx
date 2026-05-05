'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get('next') ?? '/setup/confirmed';

    // Implicit flow puts errors in the URL fragment (e.g. expired tokens).
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      router.replace('/setup?error=verification_failed');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session) {
          router.replace(next);
        } else {
          router.replace('/setup?error=verification_failed');
        }
      }
    });

    return () => subscription.unsubscribe();
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
