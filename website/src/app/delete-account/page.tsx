import Link from 'next/link';

export const metadata = {
  title: 'Delete Your Account — The Executive Meditator',
  description:
    'Request deletion of your Executive Meditator account and associated data.',
};

const SUPPORT_EMAIL = 'hillisoralee@gmail.com';
const DELETION_SUBJECT = 'Account deletion request';
const DELETION_BODY =
  'Hello,%0D%0A%0D%0A' +
  'I would like to request deletion of my Executive Meditator account and all associated data.%0D%0A%0D%0A' +
  'Account email: [the email you signed up with]%0D%0A%0D%0A' +
  'Thank you.';

export default function DeleteAccountPage() {
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
            Account
          </p>
          <h1 className="font-serif text-4xl text-white font-light mb-2">
            Delete Your Account
          </h1>
          <p className="font-sans text-xs text-cream-200 opacity-40 mb-10">
            Last updated: May 4, 2026
          </p>

          <div className="flex flex-col gap-10 font-sans text-sm text-cream-200 leading-relaxed opacity-80">
            <section>
              <p>
                You have the right to delete your Executive Meditator account
                and the personal data associated with it at any time. This page
                explains how to make that request and what will happen
                afterward.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                Two ways to delete your account
              </h2>

              <h3 className="font-serif text-base text-white font-light mb-2 mt-5">
                Option 1 — From inside the app
              </h3>
              <p>
                Open The Executive Meditator app on your phone. Go to{' '}
                <span className="text-gold-400">Settings</span> and select{' '}
                <span className="text-gold-400">Delete account</span>. Confirm
                the action when prompted. Your account will be removed
                immediately.
              </p>

              <h3 className="font-serif text-base text-white font-light mb-2 mt-6">
                Option 2 — By email request
              </h3>
              <p>
                If you cannot access the app, email us at{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                    DELETION_SUBJECT,
                  )}&body=${DELETION_BODY}`}
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  {SUPPORT_EMAIL}
                </a>{' '}
                from the email address associated with your account, with the
                subject line &quot;Account deletion request.&quot; We will
                process your request within 30 days and confirm by email when
                deletion is complete.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                What gets deleted
              </h2>
              <ul className="list-disc list-outside ml-5 flex flex-col gap-2">
                <li>Your account credentials (email, password)</li>
                <li>
                  Your profile data (name, meditation week progress, reminder
                  schedule, awake-window settings, time zone)
                </li>
                <li>Your push notification identifiers</li>
                <li>Any in-app preferences and history</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                What may be retained
              </h2>
              <p>
                We may retain a limited record of your purchase transaction
                (date, amount, transaction ID) for as long as required by U.S.
                tax and accounting law. This record does not include your name,
                email, or any behavioral data — it is preserved only for
                compliance purposes. Stripe, our payment processor, retains
                its own transaction record under its{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  privacy policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                Timeline
              </h2>
              <p>
                In-app deletions take effect immediately. Email-requested
                deletions are completed within 30 days, typically much sooner.
                You will receive an email confirmation once your account has
                been removed.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                Need help?
              </h2>
              <p>
                If you have questions about deletion or your data, contact us
                at{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  {SUPPORT_EMAIL}
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
    </main>
  );
}
