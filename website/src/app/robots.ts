import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.theexecutivemeditator.com';

export default function robots(): MetadataRoute.Robots {
  return {
    // Allow crawling everything. The /setup funnel is kept out of the index via
    // a noindex meta tag (see src/app/setup/layout.tsx) rather than a Disallow,
    // so Googlebot can actually read the noindex directive.
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
