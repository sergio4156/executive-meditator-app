/**
 * In-app purchase — iOS only.
 *
 * Apple's Guideline 3.1.1 requires that digital content unlocked inside an iOS
 * app be purchasable with In-App Purchase. Selling only on the website was the
 * cited reason build 1 was rejected.
 *
 * ANDROID IS DELIBERATELY EXCLUDED. Google Play's Payments policy has the same
 * requirement in principle, but we are not shipping Play Billing yet, and a
 * paywall that advertises a price it cannot charge is worse than one that says
 * nothing. Every function here no-ops on Android, so the Android build keeps
 * the existing "contact support" paywall untouched.
 *
 * THE CLIENT NEVER DECIDES ENTITLEMENT. A purchase here ends with the
 * transaction being sent to the `verify-apple-purchase` Edge Function, which
 * asks Apple directly and writes `access_expires_at`. A jailbroken device can
 * fabricate a StoreKit response; it cannot fabricate Apple's answer to our
 * server. Nothing in this file writes access state.
 */
import {Platform} from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type SubscriptionIOS,
  type SubscriptionPurchase,
  type ProductPurchase,
  type PurchaseError,
} from 'react-native-iap';

import {supabase} from '@/config/supabase';

/**
 * Must match the product ID created in App Store Connect exactly. A mismatch
 * does not error — `getSubscriptions` simply returns an empty array, and the
 * paywall shows no price at all. Checked explicitly in `fetchSubscription`.
 */
export const IOS_SUBSCRIPTION_SKU = 'com.executivemeditator.access.3month';

/** Fallback price shown only if StoreKit cannot be reached. See below. */
export const FALLBACK_PRICE = '$19.99';

export const IAP_AVAILABLE = Platform.OS === 'ios';

export interface SubscriptionOffer {
  sku: string;
  /**
   * Apple's own localized price string, e.g. "$19.99" or "£17.99". Always
   * prefer this over a hardcoded amount: Apple sets the local price for each
   * storefront, so a hardcoded "$19.99" is wrong in every country outside the
   * US and misstating the price is itself a rejection reason.
   */
  localizedPrice: string;
  title: string;
  description: string;
}

/**
 * Open the StoreKit connection. Safe to call more than once.
 *
 * Returns false rather than throwing when the store is unreachable — no
 * network on first launch, a simulator without a sandbox account — so the
 * paywall can still render and offer Restore and support.
 */
export async function initIap(): Promise<boolean> {
  if (!IAP_AVAILABLE) {return false;}
  try {
    await initConnection();
    return true;
  } catch {
    return false;
  }
}

export async function endIap(): Promise<void> {
  if (!IAP_AVAILABLE) {return;}
  try {
    await endConnection();
  } catch {
    // Teardown is best-effort; a failure here must not surface to the user.
  }
}

/**
 * Fetch the subscription's real price and description from the App Store.
 *
 * Returns null when the product is unavailable, which in practice means one of:
 * the product ID does not match App Store Connect, the subscription has not
 * cleared review, or the device is offline. All three look identical from here,
 * so the caller shows the fallback price rather than trying to distinguish.
 */
export async function fetchSubscription(): Promise<SubscriptionOffer | null> {
  if (!IAP_AVAILABLE) {return null;}
  try {
    // `getSubscriptions` is typed as the iOS|Android union. This whole module
    // is unreachable off iOS (guarded above), so narrowing to the iOS shape is
    // sound and gives us `localizedPrice`, which the Android shape lacks.
    const products = (await getSubscriptions({
      skus: [IOS_SUBSCRIPTION_SKU],
    })) as SubscriptionIOS[];
    const product = products.find(p => p.productId === IOS_SUBSCRIPTION_SKU);
    if (!product) {return null;}
    return {
      sku: product.productId,
      localizedPrice: product.localizedPrice ?? FALLBACK_PRICE,
      title: product.title ?? 'Executive Meditator Access',
      description: product.description ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Start the App Store purchase sheet.
 *
 * Resolves as soon as Apple accepts the request. The purchase itself arrives
 * asynchronously on the listener registered by `listenForPurchases` — StoreKit
 * can deliver a transaction minutes later (Ask to Buy, interrupted payment,
 * an app relaunch), so the listener, not this call, is what grants access.
 */
export async function purchaseSubscription(): Promise<void> {
  if (!IAP_AVAILABLE) {
    throw new Error('In-app purchase is not available on this platform.');
  }
  await requestSubscription({sku: IOS_SUBSCRIPTION_SKU});
}

/**
 * Send a transaction to our server, which asks Apple whether it is real.
 *
 * Returns the resulting expiry, or null if the server declined it.
 *
 * The Edge Function is called with the user's session JWT, so it knows which
 * account to credit without trusting a user id from the request body — that
 * would let anyone credit anyone else's account with their own transaction.
 */
async function verifyWithServer(
  transactionId: string,
): Promise<string | null> {
  const {data, error} = await supabase.functions.invoke(
    'verify-apple-purchase',
    {body: {transactionId}},
  );
  if (error) {return null;}
  const expiry = (data as {accessExpiresAt?: string} | null)?.accessExpiresAt;
  return typeof expiry === 'string' && expiry.length > 0 ? expiry : null;
}

/**
 * Pull a usable transaction id off a StoreKit purchase.
 *
 * `originalTransactionIdentifierIOS` is preferred: for an auto-renewing
 * subscription it is stable across every renewal, so it identifies the
 * SUBSCRIPTION rather than one payment. `transactionId` changes each renewal
 * and is only used when the original is missing.
 */
function transactionIdOf(
  purchase: SubscriptionPurchase | ProductPurchase,
): string | null {
  const original = (purchase as SubscriptionPurchase)
    .originalTransactionIdentifierIOS;
  if (original) {return original;}
  return purchase.transactionId ?? null;
}

export interface PurchaseHandlers {
  /** Access granted; carries the server-confirmed expiry. */
  onGranted: (accessExpiresAt: string) => void;
  /** Purchase completed at Apple but our server would not confirm it. */
  onVerificationFailed: () => void;
  /** Purchase failed or was cancelled. `cancelled` distinguishes the two. */
  onError: (message: string, cancelled: boolean) => void;
}

/**
 * Register StoreKit listeners. Returns an unsubscribe function.
 *
 * Should be mounted for as long as the paywall is on screen. Purchases made
 * outside that window (a renewal, a deferred Ask to Buy approval) are picked up
 * by the App Store Server Notifications webhook instead, which is why access
 * does not depend on the app being open.
 */
export function listenForPurchases(handlers: PurchaseHandlers): () => void {
  if (!IAP_AVAILABLE) {return () => {};}

  const updateSub = purchaseUpdatedListener(async purchase => {
    const transactionId = transactionIdOf(purchase);
    if (!transactionId) {
      handlers.onVerificationFailed();
      return;
    }

    const expiry = await verifyWithServer(transactionId);

    if (!expiry) {
      // NOT finished. An unfinished transaction is redelivered by StoreKit on
      // the next launch, which is the retry path for a user who paid while our
      // backend was down. Finishing it here would discard that.
      handlers.onVerificationFailed();
      return;
    }

    try {
      // Only now, with access recorded on the server, is it safe to tell Apple
      // we are done — after this the transaction is never redelivered.
      await finishTransaction({purchase, isConsumable: false});
    } catch {
      // Access is already granted; a failure to acknowledge only means
      // StoreKit will offer the transaction again, which is harmless.
    }

    handlers.onGranted(expiry);
  });

  const errorSub = purchaseErrorListener((err: PurchaseError) => {
    // E_USER_CANCELLED is the user tapping Cancel — an ordinary outcome, not
    // an error to apologise for.
    const cancelled = err.code === 'E_USER_CANCELLED';
    handlers.onError(err.message ?? 'The purchase could not be completed.', cancelled);
  });

  return () => {
    updateSub.remove();
    errorSub.remove();
  };
}

/**
 * Restore Purchases.
 *
 * REQUIRED by Apple for auto-renewable subscriptions — an app with no restore
 * path is rejected. It is also the real recovery flow for a user who reinstalls
 * the app or signs in on a second device, since entitlement lives with their
 * Apple ID, not with this install.
 *
 * Returns the confirmed expiry, or null if the Apple ID owns nothing for this
 * app. Every restored transaction is re-verified server-side; the client does
 * not decide that a restore is valid.
 */
export async function restorePurchases(): Promise<string | null> {
  if (!IAP_AVAILABLE) {return null;}

  const purchases = await getAvailablePurchases();
  const ours = purchases.filter(p => p.productId === IOS_SUBSCRIPTION_SKU);
  if (ours.length === 0) {return null;}

  // A long-standing subscriber can have many transactions. Verify each until
  // one comes back active, rather than assuming the array is ordered — an
  // expired transaction appearing first would otherwise report "nothing to
  // restore" to someone who is currently subscribed.
  let latest: string | null = null;
  for (const purchase of ours) {
    const transactionId = transactionIdOf(purchase);
    if (!transactionId) {continue;}
    const expiry = await verifyWithServer(transactionId);
    if (expiry && (!latest || new Date(expiry) > new Date(latest))) {
      latest = expiry;
    }
  }
  return latest;
}
