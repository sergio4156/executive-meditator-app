/**
 * verify-apple-purchase — Supabase Edge Function
 *
 * Called by the iOS app after a purchase or a Restore. Takes a StoreKit
 * transaction id, asks Apple what it is actually worth, and writes the result
 * to `profiles.access_expires_at`.
 *
 * This is the ONLY path by which an App Store purchase grants access. The app
 * never writes entitlement itself — see src/services/iap/index.ts.
 *
 * REQUEST   POST { transactionId: string }   with the user's Supabase JWT
 * RESPONSE  200 { accessExpiresAt: ISO } on success
 *           4xx/5xx with { error } otherwise. Any non-200 means "no access".
 *
 * Secrets: see _shared/appstore.ts, plus SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (both injected by the platform).
 */
import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  AppStoreAuthError,
  accessExpiryFor,
  getSubscriptionStatus,
} from '../_shared/appstore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS, 'Content-Type': 'application/json'},
  });
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  if (req.method !== 'POST') return json({error: 'Method not allowed'}, 405);

  /* --- Who is asking? ------------------------------------------------ */

  // The user id comes from the verified JWT, never from the request body.
  // Accepting a body-supplied user id would let anyone credit anyone else's
  // account using their own legitimately purchased transaction.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({error: 'Missing authorization'}, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {headers: {Authorization: authHeader}},
  });
  const {
    data: {user},
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) return json({error: 'Invalid session'}, 401);

  /* --- What are they claiming? --------------------------------------- */

  let transactionId: string;
  try {
    const body = await req.json();
    transactionId = String(body?.transactionId ?? '').trim();
  } catch {
    return json({error: 'Invalid request body'}, 400);
  }

  // Apple transaction ids are numeric strings. Rejecting anything else keeps
  // arbitrary input out of the upstream URL path.
  if (!/^\d{1,32}$/.test(transactionId)) {
    return json({error: 'Invalid transaction id'}, 400);
  }

  /* --- What does Apple say? ------------------------------------------ */

  let subscription;
  try {
    subscription = await getSubscriptionStatus(transactionId);
  } catch (err) {
    // A failure to reach Apple is OUR problem, not a rejection of the user's
    // purchase. 502 so the client can retry rather than reporting the purchase
    // invalid — StoreKit will redeliver the unfinished transaction.
    if (err instanceof AppStoreAuthError) {
      // Logged separately and unmistakably. This is a misconfiguration on our
      // side — wrong .p8, wrong key id, wrong issuer id, wrong bundle id, or a
      // revoked key — and it fails for EVERY customer, not just this one. It
      // must not read like an ordinary upstream hiccup in the logs.
      console.error(
        `APPLE CREDENTIALS REJECTED (${err.status}). Every purchase will fail ` +
          `until this is fixed. Check APPLE_IAP_KEY_ID / APPLE_IAP_ISSUER_ID / ` +
          `APPLE_IAP_PRIVATE_KEY / APPLE_BUNDLE_ID. ${err.message}`,
      );
      return json({error: 'Purchase verification is temporarily unavailable'}, 503);
    }
    console.error('App Store Server API error:', err);
    return json({error: 'Could not reach the App Store'}, 502);
  }

  if (!subscription) {
    console.warn('Apple did not recognise transaction', transactionId);
    return json({error: 'Transaction not recognised'}, 404);
  }

  const accessExpiresAt = accessExpiryFor(subscription);
  if (!accessExpiresAt) {
    return json({error: 'Subscription is not active'}, 403);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const originalTransactionId = subscription.originalTransactionId;

  /* --- Is this subscription already someone else's? ------------------ */

  // One Apple subscription unlocks one account. Without this check, a single
  // purchase could be replayed through Restore on any number of accounts:
  // sign in as A, restore, sign out, sign in as B, restore. Family Sharing
  // makes that a realistic path rather than a theoretical one.
  const {data: existing, error: lookupError} = await admin
    .from('profiles')
    .select('user_id')
    .eq('subscription_id', originalTransactionId)
    .eq('subscription_provider', 'apple')
    .maybeSingle();

  if (lookupError) {
    console.error('Ownership lookup failed:', lookupError);
    return json({error: 'Could not verify purchase'}, 500);
  }

  if (existing && existing.user_id !== user.id) {
    console.warn(
      'Transaction already bound to another account:',
      originalTransactionId,
    );
    return json(
      {
        error:
          'This subscription is already linked to a different account. Sign in with that account, or contact support.',
      },
      409,
    );
  }

  /* --- Grant it ------------------------------------------------------- */

  // paid_at anchors the 21-day program week and must survive renewals and
  // restores untouched — rewriting it would snap an established user back to
  // Week 1. Read first, write only if absent.
  const {data: profile} = await admin
    .from('profiles')
    .select('paid_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const {error: updateError} = await admin.from('profiles').upsert(
    {
      user_id: user.id,
      is_paid: true,
      access_expires_at: accessExpiresAt,
      subscription_provider: 'apple',
      subscription_id: originalTransactionId,
      ...(profile?.paid_at ? {} : {paid_at: new Date().toISOString()}),
      updated_at: new Date().toISOString(),
    },
    {onConflict: 'user_id'},
  );

  if (updateError) {
    // The user has paid Apple and we failed to record it. 500 so the client
    // leaves the StoreKit transaction unfinished and retries on next launch.
    console.error('Failed to record access:', updateError);
    return json({error: 'Could not record your purchase'}, 500);
  }

  console.log(
    `Granted access to ${user.id} until ${accessExpiresAt} (${subscription.environment}, status ${subscription.status})`,
  );

  return json({accessExpiresAt}, 200);
});
