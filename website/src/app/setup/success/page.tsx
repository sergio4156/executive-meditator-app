'use client';

import Link from 'next/link';

export default function SuccessPage() {
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
            Welcome to the Program
          </h1>

          <p className="font-sans text-cream-200 text-sm leading-relaxed opacity-80 mb-4">
            Your investment has been received. You now have full access to the
            Executive Meditator program.
          </p>

          <p className="font-sans text-cream-200 text-sm leading-relaxed opacity-70 mb-8">
            You will receive a confirmation email shortly with instructions on
            how to access the app and begin your journey.
          </p>

          <div className="border-t border-navy-800 pt-6">
            <p className="font-sans text-xs text-cream-200 opacity-50 leading-relaxed italic">
              Profits · Productivity · Peace
            </p>
          </div>
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
