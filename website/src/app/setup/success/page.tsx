'use client';

import Link from 'next/link';

const GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? '#';
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <span className="font-serif text-2xl text-white tracking-widest">
          The Executive <span className="text-gold-500">Meditator</span>
        </span>

        <div className="bg-navy-900 border border-navy-800 rounded-sm p-10 mt-10">
          {/* Checkmark */}
          <div className="w-12 h-12 rounded-full bg-sage-500/20 border border-sage-500/40 flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-serif text-3xl text-white font-light mb-3">
            Welcome to the Program
          </h1>
          <p className="font-sans text-cream-200 text-sm leading-relaxed opacity-80 mb-8">
            Your investment has been received. Download the app and sign in
            with the same email to unlock your full access.
          </p>

          {/* Download buttons */}
          <div className="flex flex-col gap-3 mb-8">
            <a
              href={GOOGLE_PLAY_URL}
              className="inline-flex items-center justify-center gap-3 bg-gold-500 hover:bg-gold-600 text-navy-950 font-sans text-sm font-medium tracking-widest uppercase px-6 py-4 rounded-sm transition-colors duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
              </svg>
              Download on Google Play
            </a>
            <a
              href={APP_STORE_URL}
              className="inline-flex items-center justify-center gap-3 border border-gold-500 text-gold-400 hover:bg-navy-800 font-sans text-sm font-medium tracking-widest uppercase px-6 py-4 rounded-sm transition-colors duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download on App Store
            </a>
          </div>

          {/* Instructions */}
          <div className="bg-navy-950 border border-navy-800 rounded-sm p-5 text-left mb-6">
            <p className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-3">
              Getting Started
            </p>
            <ol className="flex flex-col gap-2">
              {[
                'Download the app using one of the links above',
                'Sign in with the same email you used here',
                'Set your awake hours — reminders begin automatically',
                'When a reminder arrives, pause for 10 seconds',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 font-sans text-xs text-cream-200 opacity-70 leading-relaxed">
                  <span className="font-serif text-gold-500 font-light flex-shrink-0">0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="font-sans text-xs text-cream-200 opacity-50 leading-relaxed">
            A confirmation email with download links has been sent to your inbox.
          </p>

          <div className="border-t border-navy-800 pt-6 mt-6">
            <p className="font-sans text-xs text-cream-200 opacity-40 italic font-serif">
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
