import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Individual purchase only.
 *
 * The corporate/organization tier ($500) was removed 2026-08-29. Apple cited
 * Guideline 3.1.3(c) (Enterprise Services) on the iOS submission, reasoning that
 * because the same service was sold both to organizations and to individuals,
 * the individual sales had to go through In-App Purchase. We are not pursuing
 * organizational sales yet, so removing the tier removes that half of the
 * argument entirely rather than leaving it to interpretation.
 *
 * Companies are now handled as a conversation, not a product: the corporate
 * section on the landing page keeps its inquiry form, which routes to
 * /api/contact. No organizational price is advertised anywhere.
 *
 * Note the tier was already unreachable from the UI — the corporate pricing
 * card's CTA pointed at the inquiry anchor, never at checkout. Removing it
 * changes no working flow.
 */
/**
 * Recurring subscription, billed every 3 months.
 *
 * Was a one-time $10 payment sold as "lifetime access". Changed 2026-08-29:
 * the program runs in 21-day cycles and access now continues only while the
 * subscription is active.
 *
 * The 3-month interval is deliberate. Apple's auto-renewable subscriptions only
 * support 1 week / 1 / 2 / 3 / 6 months / 1 year — there is no 63-day option to
 * match three 21-day cycles exactly. 2 months (~61 days) would cut users off
 * two days before finishing a cycle; 3 months (~91 days) covers four full
 * cycles with a week to spare. The web price must match the App Store price,
 * so the same interval is used here.
 */
const PRICE = {
  unitAmount: 1999, // $19.99 in cents — matches the App Store tier
  intervalMonths: 3,
  name: 'The Executive Meditator',
  description:
    'Access to the Executive Meditator app and the 21-day program. Billed every 3 months. Cancel any time.',
};

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY not configured. Returning placeholder URL.');
      return NextResponse.json({ url: '/setup' });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });

    const body = await request.json().catch(() => ({}));
    const { email, userId } = body as {
      email?: string;
      userId?: string;
    };

    // `tier` is deliberately not read from the body any more. Ignoring it means
    // a stale client — or a hand-crafted request — cannot select a price we no
    // longer offer.
    const { unitAmount, intervalMonths, name, description } = PRICE;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get('origin') ?? 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            // Makes this a recurring price. Stripe expresses a 3-month cycle as
            // interval 'month' with interval_count 3; there is no 'quarter'.
            recurring: {
              interval: 'month',
              interval_count: intervalMonths,
            },
            product_data: {
              name,
              description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { supabase_user_id: userId ?? '' },
      // Checkout metadata does not propagate to the subscription, and renewal
      // events arrive against the SUBSCRIPTION, not the checkout session.
      // Without this the webhook would receive renewals it cannot attribute to
      // a user.
      subscription_data: {
        metadata: { supabase_user_id: userId ?? '' },
      },
      success_url: `${baseUrl}/setup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
