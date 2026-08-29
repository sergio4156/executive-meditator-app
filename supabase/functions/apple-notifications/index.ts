/**
 * apple-notifications — App Store Server Notifications V2 endpoint.
 *
 * Apple POSTs here when a subscription renews, lapses, is cancelled, is
 * refunded, or fails to bill. It is the App Store counterpart to the Stripe
 * webhook: without it, an iOS subscriber renews at Apple, their
 * `access_expires_at` stays at the old date, and the app locks out someone who
 * has just been charged.
 *
 * CONFIGURE the URL in App Store Connect → your app → App Information → App
 * Store Server Notifications, for BOTH Production and Sandbox. Sandbox is what
 * TestFlight and App Review transact in, so an unset sandbox URL means the
 * whole renewal path goes untested until real customers hit it.
 *
 * ─── TRUST MODEL ────────────────────────────────────────────────────────────
 * This endpoint is public and unauthenticated — it has to be, since Apple has
 * no credential of ours to present. Anyone can POST to it.
 *
 * So the notification body is NEVER treated as fact. The only thing taken from
 * it is an `originalTransactionId`, which is then used to ask Apple directly
 * (authenticated, over TLS) what the real state of that subscription is. A
 * forged notification therefore achieves nothing: either the id is unknown to
 * Apple and we grant nothing, or it is real and Apple tells us the truth,
 * which is the same answer we would have reached anyway.
 *
 * This is why there is no JWS certificate-chain verification here. Chain
 * validation would establish that Apple sent the payload; asking Apple
 * establishes something strictly stronger — what is actually true now — and
 * cannot be defeated by a mistake in hand-rolled X.509 parsing.
 *
 * `verify_jwt` MUST be disabled for this function, or Supabase rejects Apple's
 * requests before they arrive:
 *   supabase functions deploy apple-notifications --no-verify-jwt
 */
import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  BUNDLE_ID,
  accessExpiryFor,
  decodeJwsPayload,
  getSubscriptionStatus,
} from '../_shared/appstore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface NotificationPayload {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  data?: {
    bundleId?: string;
    environment?: string;
    signedTransactionInfo?: string;
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

serve(async req => {
  if (req.method !== 'POST') return json({error: 'Method not allowed'}, 405);

  /* --- Read the hint -------------------------------------------------- */

  let signedPayload: string;
  try {
    const body = await req.json();
    signedPayload = String(body?.signedPayload ?? '');
  } catch {
    return json({error: 'Invalid body'}, 400);
  }

  const notification = decodeJwsPayload<NotificationPayload>(signedPayload);
  if (!notification) return json({error: 'Unreadable payload'}, 400);

  const {notificationType, subtype, notificationUUID} = notification;

  // Cheap filter for noise aimed at a public URL. Not a security control —
  // the real one is that we re-ask Apple below.
  if (
    notification.data?.bundleId &&
    notification.data.bundleId !== BUNDLE_ID
  ) {
    return json({status: 'ignored'}, 200);
  }

  const transactionInfo = notification.data?.signedTransactionInfo;
  if (!transactionInfo) {
    // Some notification types (e.g. CONSUMPTION_REQUEST) carry no transaction.
    // Nothing to do, and Apple should not retry.
    console.log(`No transaction info on ${notificationType}; ignoring`);
    return json({status: 'ignored'}, 200);
  }

  const claimed = decodeJwsPayload<{originalTransactionId?: string}>(
    transactionInfo,
  );
  const originalTransactionId = claimed?.originalTransactionId;
  if (!originalTransactionId || !/^\d{1,32}$/.test(originalTransactionId)) {
    return json({error: 'No usable transaction id'}, 400);
  }

  /* --- Ask Apple what is actually true -------------------------------- */

  let subscription;
  try {
    subscription = await getSubscriptionStatus(originalTransactionId);
  } catch (err) {
    // 500 makes Apple retry — the notification is worth keeping. Apple retries
    // on a backoff for up to three days, which comfortably covers an outage.
    console.error('App Store Server API error:', err);
    return json({error: 'Upstream error'}, 500);
  }

  if (!subscription) {
    console.warn(
      `Apple does not recognise ${originalTransactionId} (${notificationType}) — likely forged`,
    );
    // 200, not 500: retrying will not make an unrecognised id become real, and
    // a forged POST must not be able to make us hammer Apple on a retry loop.
    return json({status: 'unrecognised'}, 200);
  }

  /* --- Apply it ------------------------------------------------------- */

  const accessExpiresAt =
    accessExpiryFor(subscription) ?? new Date().toISOString();

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const {data: updated, error} = await admin
    .from('profiles')
    .update({
      access_expires_at: accessExpiresAt,
      updated_at: new Date().toISOString(),
    })
    // Matched on the subscription id the app recorded at purchase time. This
    // is the only link from an Apple subscription back to one of our accounts;
    // the notification carries no email and no user id.
    .eq('subscription_id', subscription.originalTransactionId)
    .eq('subscription_provider', 'apple')
    .select('user_id');

  if (error) {
    console.error('Failed to apply notification:', error);
    return json({error: 'Database error'}, 500);
  }

  if (!updated || updated.length === 0) {
    // Normal for the very first notification of a purchase: Apple can send
    // SUBSCRIBED before the app's verify-apple-purchase call has bound the
    // subscription to an account. That call writes the same expiry moments
    // later, so nothing is lost and Apple should not retry.
    console.log(
      `No profile yet for ${subscription.originalTransactionId} (${notificationType}/${subtype})`,
    );
    return json({status: 'no_matching_profile'}, 200);
  }

  console.log(
    `${notificationType}/${subtype} [${notificationUUID}] → ${updated[0].user_id} access until ${accessExpiresAt}`,
  );

  return json({status: 'ok'}, 200);
});
