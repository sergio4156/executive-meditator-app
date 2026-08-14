import type { Metadata } from 'next';

// The /auth routes are transactional, not content: /auth/callback is a
// transient handler that consumes a one-time code, and /auth/reset-password is
// a form reached from an emailed link. Neither is a useful search result, and
// an indexed reset-password page invites confusion (and "Duplicate without
// canonical" / "Page with redirect" reports in Search Console).
//
// Mirrors the /setup treatment: noindex, but crawling stays ALLOWED so Google
// can actually read this directive — do NOT also disallow /auth in robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
