import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

type Tier = 'individual' | 'corporate';

const TIER_CONFIG: Record<Tier, { unitAmount: number; name: string; description: string }> = {
  individual: {
    unitAmount: 1000, // $10.00 in cents
    name: 'The Executive Meditator — Individual',
    description:
      'Lifetime access to the Executive Meditator app and the complete 21-day program. One-time purchase, no subscription.',
  },
  corporate: {
    unitAmount: 50000, // $500.00 in cents
    name: 'The Executive Meditator — Corporate (up to 500 employees)',
    description:
      'Organization-wide license for the Executive Meditator app and the 21-day program. Covers up to 500 employees, one-time purchase, no subscription.',
  },
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
    const { email, userId, tier } = body as {
      email?: string;
      userId?: string;
      tier?: Tier;
    };

    const resolvedTier: Tier = tier === 'corporate' ? 'corporate' : 'individual';
    const { unitAmount, name, description } = TIER_CONFIG[resolvedTier];

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
      metadata: { supabase_user_id: userId ?? '', tier: resolvedTier },
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
