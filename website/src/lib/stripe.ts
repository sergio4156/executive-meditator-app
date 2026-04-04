/**
 * Stripe checkout helper.
 *
 * The payment flow in this app creates a Stripe Checkout session server-side
 * via /api/stripe/checkout and redirects the browser to Stripe's hosted page.
 * This helper encapsulates that redirect logic for use in client components.
 */

export async function redirectToCheckout(email?: string): Promise<void> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email ?? '' }),
  });

  if (!res.ok) {
    throw new Error('Failed to create checkout session.');
  }

  const data = (await res.json()) as { url?: string; error?: string };

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error('No checkout URL returned.');
  }
}
