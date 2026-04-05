'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');

  useEffect(() => {
    async function initiateCheckout() {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setStatus('error');
          return;
        }

        setStatus('redirecting');

        // Create Stripe checkout session
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email }),
        });

        const { url } = await res.json();

        if (url && url !== '/setup') {
          // Redirect to Stripe hosted checkout
          window.location.href = url;
        } else {
          // Stripe not configured yet — go to home
          window.location.href = '/?verified=true';
        }
      } catch {
        setStatus('error');
      }
    }

    initiateCheckout();
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <span className="font-serif text-2xl text-white tracking-widest">
          Executive <span className="text-gold-500">Meditator</span>
        </span>

        <div className="bg-navy-900 border border-navy-800 rounded-sm p-10 mt-10">
          {status === 'loading' && (
            <>
              <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-6" aria-hidden="true" />
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Verifying your account...
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70">
                Just a moment while we confirm your email.
              </p>
            </>
          )}

          {status === 'redirecting' && (
            <>
              <div className="w-12 h-12 rounded-full bg-sage-500/20 border border-sage-500/40 flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Email Confirmed
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70 leading-relaxed">
                Taking you to secure checkout to complete your Executive tier investment...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Something went wrong
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70 leading-relaxed mb-6">
                We could not verify your session. Please try signing in again.
              </p>
              <a
                href="/setup"
                className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-950 font-sans text-sm font-medium tracking-widest uppercase px-8 py-3 rounded-sm transition-colors duration-200"
              >
                Return to Setup
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
