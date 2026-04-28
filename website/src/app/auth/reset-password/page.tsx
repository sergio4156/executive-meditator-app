'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'ready' | 'updating' | 'success' | 'error';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
        setStatus('ready');
      }
    });

    // The mobile app's Supabase client uses the implicit flow, so recovery
    // emails land here with tokens in the URL hash (#access_token=...).
    // The website client is PKCE-only and won't auto-process the hash, so we
    // parse it manually and establish the session.
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.length > 1) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (access_token && refresh_token && type === 'recovery') {
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              setErrorMessage(
                'This password reset link is invalid or has expired. Please request a new one.',
              );
              setStatus('error');
            } else {
              setStatus('ready');
              window.history.replaceState(null, '', window.location.pathname);
            }
          });
        return () => subscription.unsubscribe();
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus(prev => (prev === 'verifying' ? 'ready' : prev));
      } else {
        setTimeout(() => {
          setStatus(prev => {
            if (prev === 'verifying') {
              setErrorMessage(
                'This password reset link is invalid or has expired. Please request a new one.',
              );
              return 'error';
            }
            return prev;
          });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter and try again.');
      return;
    }

    setStatus('updating');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setStatus('ready');
      return;
    }

    // Sign out so the recovery session doesn't carry over and the user
    // explicitly signs in with their new password (cleaner UX).
    await supabase.auth.signOut();
    setStatus('success');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link
            href="/"
            className="font-serif text-2xl text-white tracking-widest"
          >
            The Executive <span className="text-gold-500">Meditator</span>
          </Link>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-sm p-10">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-6" aria-hidden="true" />
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Verifying reset link...
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70">
                Just a moment.
              </p>
            </div>
          )}

          {(status === 'ready' || status === 'updating') && (
            <>
              <h1 className="font-serif text-3xl text-white font-light mb-3 text-center">
                Set a New Password
              </h1>
              <p className="font-sans text-cream-200 text-sm text-center mb-8 leading-relaxed opacity-80">
                Choose a new password to access your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm pl-4 pr-12 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                      placeholder="Choose a secure password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-cream-200 opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.585 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.293 5.382M6.61 6.61C4.61 7.93 3.066 9.79 2.458 12c1.274 4.057 5.064 7 9.542 7 1.59 0 3.103-.37 4.435-1.03" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm pl-4 pr-12 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                      placeholder="Re-enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(s => !s)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-cream-200 opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.585 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.293 5.382M6.61 6.61C4.61 7.93 3.066 9.79 2.458 12c1.274 4.057 5.064 7 9.542 7 1.59 0 3.103-.37 4.435-1.03" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p role="alert" className="font-sans text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-sm px-4 py-3">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'updating'}
                  className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 disabled:cursor-not-allowed text-navy-950 font-sans text-sm font-medium tracking-widest uppercase py-4 rounded-sm transition-colors duration-200 mt-2"
                >
                  {status === 'updating' ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-sage-500/20 border border-sage-500/40 flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Password Updated
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70 leading-relaxed">
                You can now sign into the app with your new password.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <h1 className="font-serif text-2xl text-white font-light mb-3">
                Reset Link Issue
              </h1>
              <p className="font-sans text-cream-200 text-sm opacity-70 leading-relaxed mb-6">
                {errorMessage || 'This reset link cannot be used.'}
              </p>
              <Link
                href="/setup"
                className="inline-block font-sans text-sm text-gold-400 hover:text-gold-300"
              >
                Return to setup →
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="font-sans text-xs text-cream-200 opacity-40 hover:opacity-70 transition-opacity"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
