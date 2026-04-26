import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — The Executive Meditator',
  description: 'Terms of Service for The Executive Meditator app and website.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy-950 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link
            href="/"
            className="font-serif text-2xl text-white tracking-widest"
          >
            The Executive <span className="text-gold-500">Meditator</span>
          </Link>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-sm p-10">
          <p className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-2">
            Legal
          </p>
          <h1 className="font-serif text-4xl text-white font-light mb-2">
            Terms of Service
          </h1>
          <p className="font-sans text-xs text-cream-200 opacity-40 mb-10">
            Last updated: April 26, 2026
          </p>

          <div className="flex flex-col gap-10 font-sans text-sm text-cream-200 leading-relaxed opacity-80">
            <section>
              <p className="italic opacity-70">
                These Terms are placeholder content drafted for launch readiness. Owner should
                review with counsel and replace with finalized language before commercial launch.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By creating an account or using The Executive Meditator (the &quot;Service&quot;), you
                agree to these Terms of Service and our{' '}
                <Link href="/privacy" className="text-gold-400 hover:text-gold-300">
                  Privacy Policy
                </Link>
                . If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                2. Description of Service
              </h2>
              <p>
                The Executive Meditator is a guided micro-meditation reminder service that
                delivers timed push notifications based on a multi-week program. Access is
                granted through a one-time payment via our website.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                3. Account
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your account
                credentials and for all activity under your account. Notify us immediately if
                you suspect unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                4. Payment and Refunds
              </h2>
              <p>
                Payments are processed by Stripe. All fees are stated at checkout and are
                non-refundable except as required by applicable law or as specified by us in
                writing.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                5. Acceptable Use
              </h2>
              <p>
                You agree not to misuse the Service: do not attempt unauthorized access,
                interfere with infrastructure, redistribute the Service, or use it for any
                unlawful purpose.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                6. Medical Disclaimer
              </h2>
              <p>
                The Service is for general wellness and is not intended to diagnose, treat,
                cure, or prevent any medical condition. Consult a qualified professional before
                making decisions about your health.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                7. Limitation of Liability
              </h2>
              <p>
                The Service is provided &quot;as is.&quot; To the maximum extent permitted by law,
                we disclaim all warranties and are not liable for any indirect, incidental, or
                consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                8. Termination
              </h2>
              <p>
                We may suspend or terminate your account if you violate these Terms. You may
                terminate your account at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                9. Changes to Terms
              </h2>
              <p>
                We may revise these Terms periodically. Material changes will be communicated
                via email or in-app notification. Continued use of the Service constitutes
                acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                10. Contact
              </h2>
              <p>
                Questions about these Terms may be directed to{' '}
                <a
                  href="mailto:hillisoralee@gmail.com"
                  className="text-gold-400 hover:text-gold-300"
                >
                  hillisoralee@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center">
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
