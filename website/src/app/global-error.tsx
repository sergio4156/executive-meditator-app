'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Catches React rendering errors in the App Router and reports them to Sentry.
 * Sentry.captureException is a no-op until a DSN is configured, so this is safe
 * with monitoring disabled.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1220',
          color: '#FAF7F2',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <h1 style={{ fontWeight: 300, color: '#C9A84C', marginBottom: 12 }}>
          Something went wrong
        </h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>
          Please refresh the page or try again in a moment.
        </p>
        {/*
          Deliberately a plain <a>, not next/link. global-error.tsx replaces the
          root layout when the app has crashed, so the router context it renders
          into is exactly the thing that may be broken. A hard navigation forces
          a full page load and a clean React tree, which is the recovery we want
          here — client-side routing could land the user right back in the
          broken state.
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            color: '#0B1220',
            background: '#C9A84C',
            textDecoration: 'none',
            padding: '12px 28px',
            borderRadius: 2,
            fontSize: 14,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Return Home
        </a>
      </body>
    </html>
  );
}
