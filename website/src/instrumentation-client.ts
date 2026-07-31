import * as Sentry from '@sentry/nextjs';

/**
 * Browser error monitoring. Env-gated on NEXT_PUBLIC_SENTRY_DSN — a no-op until
 * that value is set in the Vercel environment, so there is no client-side impact
 * (or extra network calls) until monitoring is deliberately enabled.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Session Replay off by default (privacy + cost); enable later if wanted.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
