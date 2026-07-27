import type { Metadata } from 'next';

// The /setup funnel (signup, /setup/confirmed which redirects to Stripe, and
// /setup/success) is transactional — it should not be indexed by search
// engines. noindex avoids "Duplicate without canonical" and "Page with
// redirect" reports for these pages. Crawling stays allowed so Google can read
// this directive (do NOT also disallow /setup in robots).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
