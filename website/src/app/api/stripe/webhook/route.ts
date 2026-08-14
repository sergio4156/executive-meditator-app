import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';
// Relative, not '@/lib/...': the repo-root jest config maps '@/' to the MOBILE
// src/ directory, so an alias here resolves to the wrong package when the root
// test run picks up this file.
import { trackPurchase } from '../../../../lib/analytics';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' });

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }
  } else {
    event = JSON.parse(body);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id || undefined;
    const email = session.customer_email || undefined;

    // A payment we cannot attribute must NOT be acked with 200, or Stripe stops
    // retrying and the customer is charged but never granted access.
    if (!userId && !email) {
      console.error('Webhook: session', session.id, 'has neither supabase_user_id nor customer_email — cannot apply payment');
      return NextResponse.json({ error: 'No user identifier on session.' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Locate the profile — prefer user_id (from checkout metadata), fall back to email.
    const lookup = supabase
      .from('profiles')
      .select('user_id, is_paid, stripe_session_id');
    const { data: profiles, error: lookupError } = await (
      userId ? lookup.eq('user_id', userId) : lookup.eq('email', email!)
    );

    if (lookupError) {
      console.error('Webhook: profile lookup failed:', lookupError);
      return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
    }

    // No matching profile — return non-200 so Stripe retries and surfaces the failure.
    if (!profiles || profiles.length === 0) {
      console.error(
        'Webhook: no profile matched for',
        userId ? `user_id ${userId}` : `email ${email}`,
        '(session ' + session.id + ') — returning 500 so Stripe retries'
      );
      return NextResponse.json({ error: 'Profile not found.' }, { status: 500 });
    }

    const profile = profiles[0];

    // Idempotency: Stripe delivers at-least-once and retries. If we already
    // applied this payment, ack without resetting paid_at (which would rewind the
    // user's 21-day program) or re-sending the welcome email.
    if (profile.is_paid || profile.stripe_session_id === session.id) {
      console.log('Webhook: payment already applied for', profile.user_id, '— skipping (idempotent)');
      return NextResponse.json({ received: true, idempotent: true });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_paid: true,
        stripe_session_id: session.id,
        paid_at: new Date().toISOString(),
        ...(email ? { email } : {}),
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('Failed to mark user as paid:', updateError);
      return NextResponse.json({ error: 'DB update failed.' }, { status: 500 });
    }

    console.log(`Payment confirmed for user ${profile.user_id} (${email ?? 'no email'})`);

    // Sits after the idempotency guard above, so a Stripe retry cannot
    // double-count revenue. Awaited but never able to throw — see lib/analytics.
    await trackPurchase({
      userId: profile.user_id,
      amountMinorUnits: session.amount_total,
      currency: session.currency,
    });

    // Send the welcome/download email. The payment is already recorded, so a mail
    // failure must not fail the webhook (that would trigger a retry; idempotency
    // then blocks a duplicate email anyway).
    if (email) {
      try {
        await sendDownloadEmail(email);
      } catch (mailErr) {
        console.error('Payment recorded, but welcome email failed to send:', mailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function sendDownloadEmail(email: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured — skipping download email.');
    return;
  }

  const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? '#';
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#';

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: 'The Executive Meditator <noreply@theexecutivemeditator.com>',
    replyTo: 'admin@theexecutivemeditator.com',
    to: email,
    subject: 'Welcome to The Executive Meditator — download the app',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0F1E35; color: #F8F5F0; border-radius: 4px;">
        <h1 style="font-size: 28px; font-weight: 300; color: #C4A962; margin-bottom: 8px;">
          Welcome to The Executive Meditator
        </h1>
        <p style="font-size: 14px; color: #E8E3DB; opacity: 0.8; margin-bottom: 24px; border-bottom: 1px solid #1B2B4B; padding-bottom: 20px;">
          Your purchase has been received. You now have lifetime access to the 21-day program.
        </p>

        <p style="font-size: 15px; color: #E8E3DB; line-height: 1.7; margin-bottom: 24px;">
          The next step is to download the app and sign in with this email address
          (<strong style="color: #C4A962;">${email}</strong>) to unlock the Great Silence.
        </p>

        <div style="margin: 32px 0;">
          <p style="font-size: 12px; color: #C4A962; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">
            Download the App
          </p>
          <a href="${googlePlayUrl}" style="display: inline-block; background: #C4A962; color: #0F1E35; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 2px; margin-right: 12px; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">
            Google Play
          </a>
          <a href="${appStoreUrl}" style="display: inline-block; border: 1px solid #C4A962; color: #C4A962; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 2px; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">
            App Store
          </a>
        </div>

        <div style="background: #1B2B4B; border-radius: 4px; padding: 20px; margin-bottom: 28px;">
          <p style="font-size: 13px; color: #E8E3DB; margin: 0; line-height: 1.7;">
            <strong style="color: #C4A962;">How it works:</strong><br/>
            1. Download the app using one of the links above<br/>
            2. Sign in with <strong>${email}</strong><br/>
            3. Set your awake hours — a minimum of 5 is recommended<br/>
            4. When a reminder arrives, pause for 10 seconds and enter the Great Silence
          </p>
        </div>

        <p style="font-size: 13px; color: #E8E3DB; opacity: 0.6; line-height: 1.7;">
          Questions? Reply to this email or reach us at
          <a href="mailto:admin@theexecutivemeditator.com" style="color: #C4A962;">admin@theexecutivemeditator.com</a>
        </p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1B2B4B;">
          <p style="font-size: 12px; color: #C4A962; font-style: italic; margin: 0;">
            Profits · Productivity · Peace
          </p>
        </div>
      </div>
    `,
  });
}
