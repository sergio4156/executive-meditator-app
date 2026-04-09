import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' });

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }
  } else {
    // No webhook secret configured — parse raw body (dev only)
    event = JSON.parse(body);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;

    if (email) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
        .from('profiles')
        .update({
          is_paid: true,
          stripe_session_id: session.id,
          paid_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) {
        console.error('Failed to mark user as paid:', error);
        return NextResponse.json({ error: 'DB update failed.' }, { status: 500 });
      }

      console.log(`Payment confirmed for ${email}`);
    }
  }

  return NextResponse.json({ received: true });
}
