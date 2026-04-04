import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY not configured. Returning placeholder URL.');
      return NextResponse.json({ url: '/setup' });
    }

    // Dynamically import stripe to avoid build errors if key isn't set
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });

    const body = await request.json().catch(() => ({}));
    const { email } = body as { email?: string };

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get('origin') ?? 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 50000, // $500.00 in cents
            product_data: {
              name: 'Executive Meditator — Executive Tier',
              description:
                'Full access to the Executive Meditator program. Includes the complete 3-week guided meditation journey designed for high-performing leaders.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/setup?session_id={CHECKOUT_SESSION_ID}`,
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
