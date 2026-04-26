'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter and try again.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please review and accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup/confirmed`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Notify owner of new signup
      await fetch('/api/notify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email }),
      }).catch(() => {}); // fire-and-forget, don't block UX

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <span className="font-serif text-2xl text-white tracking-widest">
            The Executive <span className="text-gold-500">Meditator</span>
          </span>
          <div className="bg-navy-900 border border-navy-800 rounded-sm p-10 mt-10">
            <div className="w-12 h-12 rounded-full bg-sage-500/20 border border-sage-500/40 flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-white font-light mb-3">
              Check Your Email
            </h1>
            <p className="font-sans text-cream-200 text-sm leading-relaxed opacity-80">
              We sent a confirmation link to <span className="text-gold-400">{email}</span>.
              Please verify your email to complete your account setup.
            </p>
            <p className="font-sans text-cream-200 text-xs leading-relaxed opacity-50 mt-4">
              Once verified, you will be directed to complete your investment in the Executive tier.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block mt-6 font-sans text-xs text-cream-200 opacity-40 hover:opacity-70 transition-opacity"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cream-200 hover:text-gold-400 transition-colors duration-200 mb-10 font-sans text-sm tracking-wide"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Logo */}
        <div className="text-center mb-10">
          <span className="font-serif text-2xl text-white tracking-widest">
            The Executive <span className="text-gold-500">Meditator</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-navy-900 border border-navy-800 rounded-sm p-10">
          <h1 className="font-serif text-3xl md:text-4xl text-white font-light mb-3 text-center">
            Begin Your Journey
          </h1>
          <p className="font-sans text-cream-200 text-sm text-center mb-8 leading-relaxed opacity-80">
            Create your executive account to access the full meditation program
            and begin experiencing the 3 P&apos;s — Profits, Productivity, and Peace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label
                htmlFor="full-name"
                className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
              >
                Full Name
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm px-4 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm px-4 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
              >
                Password
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

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block font-sans text-xs text-cream-200 uppercase tracking-widest mb-2 opacity-70"
              >
                Confirm Password
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
                  placeholder="Re-enter your password"
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

            {/* Terms acceptance */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-gold-500 cursor-pointer flex-shrink-0"
                aria-describedby="terms-text"
              />
              <span
                id="terms-text"
                className="font-sans text-xs text-cream-200 opacity-70 leading-relaxed"
              >
                I agree to the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {/* Error */}
            {error && (
              <p role="alert" className="font-sans text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-sm px-4 py-3">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 disabled:cursor-not-allowed text-navy-950 font-sans text-sm font-medium tracking-widest uppercase py-4 rounded-sm transition-colors duration-200 mt-2"
            >
              {loading ? 'Creating Account...' : 'Create Executive Account'}
            </button>
          </form>

          {/* Stripe note */}
          <p className="mt-6 text-center font-sans text-xs text-cream-200 opacity-50 leading-relaxed">
            After creating your account, you will be directed to a secure Stripe
            checkout to complete your investment in the Executive tier.
          </p>
        </div>

        <p className="mt-6 text-center font-sans text-xs text-cream-200 opacity-40">
          &copy; {new Date().getFullYear()} The Executive Meditator. All rights reserved.
        </p>
      </div>
    </div>
  );
}
