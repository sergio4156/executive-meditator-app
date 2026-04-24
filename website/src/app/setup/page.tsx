'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
            Executive <span className="text-gold-500">Meditator</span>
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
            Executive <span className="text-gold-500">Meditator</span>
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
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm px-4 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                placeholder="Choose a secure password"
              />
            </div>

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
