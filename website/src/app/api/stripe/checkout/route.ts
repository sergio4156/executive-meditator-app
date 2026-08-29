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
const PRICE = {
  unitAmount: 1000, // $10.00 in cents
  name: 'The Executive Meditator — Individual',
  description:
    'Lifetime access to the Executive Meditator app and the complete 21-day program. One-time purchase, no subscription.',
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
    const { unitAmount, name, description } = PRICE;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get('origin') ?? 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name,
              description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { supabase_user_id: userId ?? '' },
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
