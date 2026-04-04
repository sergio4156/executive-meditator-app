import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Begin Your Journey | Executive Meditator',
  description: 'Create your Executive Meditator account and begin your transformation.',
};

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cream-200 hover:text-gold-400 transition-colors duration-200 mb-10 font-sans text-sm tracking-wide"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>

        {/* Logo */}
        <div className="text-center mb-10">
          <span className="font-serif text-2xl text-white tracking-widest">
            Executive{' '}
            <span className="text-gold-500">Meditator</span>
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

          <form className="space-y-5">
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
                className="w-full bg-navy-950 border border-navy-800 text-cream-50 font-sans text-sm px-4 py-3 rounded-sm placeholder:text-cream-200 placeholder:opacity-30 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                placeholder="Choose a secure password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-sans text-sm font-medium tracking-widest uppercase py-4 rounded-sm transition-colors duration-200 mt-2"
            >
              Create Executive Account
            </button>
          </form>

          {/* Stripe note */}
          <p className="mt-6 text-center font-sans text-xs text-cream-200 opacity-50 leading-relaxed">
            After creating your account, you will be directed to a secure Stripe
            checkout to complete your investment in the Executive tier.
          </p>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center font-sans text-xs text-cream-200 opacity-40">
          &copy; {new Date().getFullYear()} Executive Meditator. All rights reserved.
        </p>
      </div>
    </div>
  );
}
