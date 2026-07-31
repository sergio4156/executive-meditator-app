import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
};

// Sentry build integration. Source-map upload is skipped automatically until
// SENTRY_AUTH_TOKEN / org / project are configured, so this is safe with no
// Sentry account yet. Runtime error reporting is env-gated in the
// instrumentation files (no DSN → no-op).
export default withSentryConfig(nextConfig, {
  silent: true,
});
