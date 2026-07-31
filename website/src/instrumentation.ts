import * as Sentry from '@sentry/nextjs';

/**
 * Server + edge error monitoring. Fully env-gated: with no SENTRY_DSN set this
 * is a no-op, so the site behaves exactly as before until monitoring is enabled
 * by adding SENTRY_DSN in the Vercel environment.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled: true,
    });
  }
}

// Captures errors thrown in nested React Server Components. Harmless no-op when
// Sentry isn't initialized (no DSN).
export const onRequestError = Sentry.captureRequestError;
