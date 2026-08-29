import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — The Executive Meditator',
  description: 'Terms of Service for The Executive Meditator app and website.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-navy-950 px-6 py-16">
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
            Last updated: August 13, 2026
          </p>

          <div className="flex flex-col gap-10 font-sans text-sm text-cream-200 leading-relaxed opacity-80">
            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                The Executive Meditator (the &quot;Service&quot;) is provided by Executive
                Meditator LLC, a Wyoming limited liability company (&quot;we&quot;, &quot;us&quot;,
                or &quot;our&quot;). By creating an account or using the Service, you
                agree to these Terms of Service and our{' '}
                <Link href="/privacy" className="text-gold-400 hover:text-gold-300 underline">
                  Privacy Policy
                </Link>
                . If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                2. Eligibility
              </h2>
              <p>
                You must be at least 18 years old to use the Service. The Service is not
                directed to children, and we do not knowingly collect information from anyone
                under 18. By using the Service you represent that you meet this requirement and
                that you have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                3. Description of Service
              </h2>
              <p>
                The Executive Meditator is a micro-meditation reminder service that delivers
                timed push notifications across a multi-week program. Access is granted through
                a recurring subscription purchased on our website, and continues for as long as
                that subscription remains active. The mobile applications do not sell anything;
                they unlock for accounts that already hold access.
              </p>
              <p className="mt-3">
                Notification delivery depends on your device, operating system, network
                connection, and notification settings, as well as third-party services outside
                our control. We do not guarantee that every reminder will arrive, or arrive at
                an exact time.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                4. Account
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your account
                credentials and for all activity under your account. Notify us immediately if
                you suspect unauthorized access. You may request deletion of your account and
                associated data at any time — see our{' '}
                <Link
                  href="/delete-account"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  account deletion page
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                5. Subscription, Billing, and Refunds
              </h2>
              <p>
                The Service is sold as an auto-renewing subscription at $19.99 every 3 months.
                Your subscription renews automatically at the same price at the end of each
                3-month term, and your payment method is charged at that time, until you
                cancel. Prices are in U.S. dollars and exclude any applicable taxes.
              </p>
              <p className="mt-3">
                You may cancel at any time. Cancellation takes effect at the end of the term
                you have already paid for — you keep access until then, and are not charged
                again. To cancel a subscription purchased on our website, use the billing link
                in your purchase receipt or contact us at{' '}
                <a
                  href="mailto:admin@theexecutivemeditator.com"
                  className="text-gold-500 hover:text-gold-400 underline"
                >
                  admin@theexecutivemeditator.com
                </a>
                . If your subscription lapses, your account and program progress are retained;
                access resumes if you subscribe again.
              </p>
              <p className="mt-3">
                Payments are processed by Stripe; we do not store your full payment card
                details. All fees are stated at checkout. Except where a refund is required by
                applicable law, or where we agree to one in writing, fees are non-refundable.
                If you believe you were charged in error, contact us and we will review the
                matter in good faith.
              </p>
              <p className="mt-3">
                If we change the subscription price, we will give you notice before the change
                takes effect, and the new price will apply only to renewals that occur after
                that notice.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                6. Acceptable Use
              </h2>
              <p>
                You agree not to misuse the Service: do not attempt unauthorized access,
                interfere with infrastructure, share or resell your access, reverse engineer the
                Service except where that right cannot lawfully be restricted, or use it for any
                unlawful purpose.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                7. Intellectual Property
              </h2>
              <p>
                The Service, including its software, program structure, text, and branding,
                remains the property of Executive Meditator LLC and its licensors. Subject to
                these Terms, we grant you a personal, non-exclusive, non-transferable, revocable
                licence to use the Service for your own non-commercial use. No other rights are
                granted.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                8. Medical Disclaimer
              </h2>
              <p>
                The Service is a general wellness product. It is not a medical device, and it is
                not intended to diagnose, treat, cure, or prevent any medical or psychological
                condition. Nothing in the Service constitutes medical advice.
              </p>
              <p className="mt-3">
                Consult a qualified professional before making decisions about your health, and
                do not disregard or delay professional advice because of anything provided
                through the Service. Use your own judgement about when it is safe to pause your
                attention: do not engage with a reminder while driving, operating machinery, or
                doing anything else that requires your full attention.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                9. Third-Party Services and App Stores
              </h2>
              <p>
                The Service relies on third parties including Stripe, Supabase, Firebase, and
                OneSignal, and is distributed through the Apple App Store and Google Play. Your
                use of those platforms is governed by their own terms. The app stores are not
                parties to these Terms and have no responsibility for the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                10. Limitation of Liability
              </h2>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the
                maximum extent permitted by law, we disclaim all warranties, express or implied,
                and are not liable for any indirect, incidental, special, or consequential
                damages arising from your use of the Service. To the maximum extent permitted by
                law, our total liability for any claim relating to the Service will not exceed
                the amount you paid us for it.
              </p>
              <p className="mt-3">
                Some jurisdictions do not allow certain exclusions or limitations, so parts of
                this section may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                11. Termination
              </h2>
              <p>
                We may suspend or terminate your account if you violate these Terms. You may
                stop using the Service and request deletion of your account at any time.
                Sections that by their nature should survive termination — including
                Intellectual Property, Medical Disclaimer, Limitation of Liability, and
                Governing Law — will continue to apply.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                12. Governing Law
              </h2>
              <p>
                These Terms are governed by the laws of the State of Wyoming, without regard to
                its conflict-of-law rules. Any dispute arising from these Terms or the Service
                will be brought in the state or federal courts located in Wyoming, and you and
                we consent to the jurisdiction of those courts. Nothing here removes any
                consumer-protection right you hold under the law of your own place of residence.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                13. General
              </h2>
              <p>
                If any provision of these Terms is found unenforceable, the remaining provisions
                stay in effect. Our failure to enforce a provision is not a waiver of it. You
                may not assign these Terms without our consent; we may assign them in connection
                with a merger, acquisition, or transfer of our business or assets. These Terms,
                together with our Privacy Policy, are the entire agreement between you and us
                regarding the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                14. Changes to Terms
              </h2>
              <p>
                We may revise these Terms periodically. The date at the top of this page shows
                when they were last updated. Material changes will be communicated via email or
                in-app notification. Continued use of the Service after a change constitutes
                acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-white font-light mb-3">
                15. Contact
              </h2>
              <p>
                Questions about these Terms may be directed to Executive Meditator
                LLC at{' '}
                <a
                  href="mailto:admin@theexecutivemeditator.com"
                  className="text-gold-400 hover:text-gold-300 underline"
                >
                  admin@theexecutivemeditator.com
                </a>
                , or by mail at PO Box 587, Cedarville, CA 96104.
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
