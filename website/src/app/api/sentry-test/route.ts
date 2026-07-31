import { NextResponse } from 'next/server';

/**
 * TEMPORARY verification endpoint — confirms Sentry is capturing server errors.
 * Visiting /api/sentry-test throws an error that should appear in the Sentry
 * dashboard. REMOVE this file once monitoring is confirmed working.
 */
export function GET() {
  throw new Error(
    'Sentry test error (server route) — verifying monitoring; safe to ignore.',
  );
  // eslint-disable-next-line no-unreachable
  return NextResponse.json({ ok: true });
}
