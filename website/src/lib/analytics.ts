/**
 * Server-side product analytics for the website.
 *
 * WHY SERVER-SIDE
 * The purchase event is the one number a reader will cross-check against
 * Stripe, so it has to be right. Firing it from the browser loses purchases to
 * ad blockers, closed tabs, and failed redirects after payment — and a revenue
 * figure that disagrees with Stripe discredits every other metric on the page.
 * Sending it from the webhook means it fires exactly when Stripe confirms money
 * moved, once, with the real amount.
 *
 * WHY NOT A BROWSER ANALYTICS SDK
 * We deliberately do not load a client-side analytics script. That would mean
 * cookies, which means a consent banner in several of the 175 countries the app
 * is listed in, for marketing-funnel data we do not yet need. This server-side
 * call sets no cookies and sends no device identifiers — only our own Supabase
 * user id and the amount.
 *
 * CONFIGURATION
 * No-ops unless GA4_MEASUREMENT_ID and GA4_API_SECRET are both set, matching how
 * RESEND_API_KEY is handled. Absent config is a silent skip, never an error —
 * analytics must not be able to fail a payment.
 */

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

interface PurchaseEvent {
  /** Supabase user id — joins this purchase to in-app behaviour. */
  userId: string;
  /** Stripe amount_total, in the smallest currency unit (e.g. cents). */
  amountMinorUnits?: number | null;
  /** ISO currency code from the Stripe session. */
  currency?: string | null;
}

/**
 * Record a confirmed purchase.
 *
 * Never throws and never rejects: callers are in a payment path where the money
 * has already moved, and a measurement failure must not turn a successful
 * payment into a webhook error that Stripe then retries.
 */
export async function trackPurchase(event: PurchaseEvent): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('GA4 not configured — skipping purchase analytics.');
    return;
  }

  try {
    const params: Record<string, string | number> = {};
    if (typeof event.amountMinorUnits === 'number') {
      // GA4 expects a major-unit decimal (12.34), Stripe reports minor units (1234).
      params.value = event.amountMinorUnits / 100;
    }
    if (event.currency) {
      params.currency = event.currency.toUpperCase();
    }

    const res = await fetch(
      `${GA4_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Measurement Protocol requires a client_id. We have no browser
          // client id here (and want no cookie to get one), so the user id
          // serves as both — it is the join key we actually care about.
          client_id: event.userId,
          user_id: event.userId,
          events: [{ name: 'purchase_completed', params }],
        }),
      },
    );

    if (!res.ok) {
      console.error('GA4 purchase event rejected:', res.status);
    }
  } catch (err) {
    console.error('GA4 purchase event failed to send:', err);
  }
}
