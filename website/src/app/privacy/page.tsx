import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — The Executive Meditator',
  description: 'Privacy Policy for The Executive Meditator app and website.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-navy-950 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
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
            Privacy Policy
          </h1>
          <p className="font-sans text-xs text-cream-200 opacity-40 mb-10">
            Last updated: June 28, 2026
          </p>

          <div className="flex flex-col gap-10 font-sans text-sm text-cream-200 leading-relaxed opacity-80">

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                1. Who We Are
              </h2>
              <p>
                The Executive Meditator is operated by Executive Meditator LLC
                ("we", "us", or "our"), a Wyoming limited liability company that
                is the data controller responsible for your personal information.
                We operate the theexecutivemeditator.com website and The Executive
                Meditator mobile application (collectively, the "Service"). We are
                committed to protecting your personal information.
              </p>
              <p className="mt-3">
                Questions about this policy may be directed to{' '}
                <a
                  href="mailto:hillisoralee@gmail.com"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  hillisoralee@gmail.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                2. Information We Collect
              </h2>
              <ul className="flex flex-col gap-2 list-none">
                {[
                  ['Email address', 'provided when you sign up or purchase access'],
                  ['Payment information', 'processed securely by Stripe — we never store your card details'],
                  ['Usage data', 'awake hours you set, meditation reminders delivered, current program week'],
                  ['Device token', 'used solely to deliver push notification reminders to your device'],
                ].map(([item, desc]) => (
                  <li key={item} className="flex gap-3">
                    <span className="font-serif text-gold-500 flex-shrink-0">—</span>
                    <span>
                      <strong className="text-cream-100">{item}</strong>
                      {' '}— {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                3. How We Use Your Information
              </h2>
              <ul className="flex flex-col gap-2 list-none">
                {[
                  'To create and manage your account',
                  'To process your payment and grant access to the program',
                  'To send timed meditation reminders during your awake hours',
                  'To send transactional emails (purchase confirmation, download links)',
                  'To improve the Service',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="font-serif text-gold-500 flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                We do not sell, rent, or share your personal information with
                third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                4. Third-Party Services
              </h2>
              <p className="mb-4">
                We use the following trusted third-party services to operate
                the Service. Each has its own privacy policy.
              </p>
              <ul className="flex flex-col gap-2 list-none">
                {[
                  ['Supabase', 'Authentication and database — stores your account and schedule data'],
                  ['Stripe', 'Payment processing — handles all card transactions securely'],
                  ['OneSignal', 'Push notifications — delivers meditation reminders to your device'],
                  ['Resend', 'Transactional email — sends purchase confirmations and download links'],
                  ['Vercel', 'Website hosting'],
                ].map(([name, desc]) => (
                  <li key={name} className="flex gap-3">
                    <span className="font-serif text-gold-500 flex-shrink-0">—</span>
                    <span>
                      <strong className="text-cream-100">{name}</strong>
                      {' '}— {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                5. Account Deletion and Data Retention
              </h2>
              <p>
                You may request deletion of your account and all associated
                personal data at any time by emailing{' '}
                <a
                  href="mailto:hillisoralee@gmail.com?subject=Delete%20My%20Account"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  hillisoralee@gmail.com
                </a>{' '}
                with the subject line "Delete My Account" from the email
                address registered to your account. We will confirm and
                process your request within 30 days.
              </p>
              <p className="mt-3">
                Upon deletion, we permanently remove your authentication
                record, profile (including reminder schedule and timezone),
                meditation logs, and push-notification subscription. We may
                retain a record of completed transactions (purchase date,
                amount, last four digits of payment method) for the period
                required by tax and accounting law, and we may retain
                anonymized usage statistics that cannot be linked back to
                you. We retain active accounts for as long as the account
                remains active.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                6. Security
              </h2>
              <p>
                We implement industry-standard measures to protect your
                information, including encrypted connections (HTTPS), secure
                authentication via Supabase, and PCI-compliant payment
                processing via Stripe. No method of transmission over the
                internet is 100% secure, but we strive to protect your data
                using commercially acceptable means.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                7. Children's Privacy
              </h2>
              <p>
                The Service is intended for adults. We do not knowingly collect
                personal information from anyone under the age of 13. If you
                believe a child has provided us with personal data, please
                contact us and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                8. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. When we
                do, we will revise the "Last updated" date at the top of this
                page. Continued use of the Service after any changes constitutes
                your acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                9. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact Executive Meditator LLC at{' '}
                <a
                  href="mailto:hillisoralee@gmail.com"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  hillisoralee@gmail.com
                </a>
                , or by mail at PO Box 587, Cedarville, CA 96104.
              </p>
            </section>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="font-sans text-xs text-cream-200 opacity-40 hover:opacity-70 transition-opacity"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
