import { NextRequest } from 'next/server';

// jest.mock is hoisted — factory must not reference block-scoped variables.
// We expose a stable object so tests can swap out the mock after hoisting.
const mockStripe = {
  create: jest.fn(),
};

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: mockStripe.create },
    },
  })),
}));

import { POST } from '../checkout/route';

function makeRequest(body: object = {}) {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  mockStripe.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' });
});

describe('POST /api/stripe/checkout', () => {
  it('returns placeholder URL when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('/setup');
  });

  it('creates a checkout session and returns the URL', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/test-session');
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer_email: 'user@example.com',
      })
    );
  });

  it('passes supabase_user_id through to Stripe session metadata', async () => {
    await POST(makeRequest({ email: 'user@example.com', userId: 'uuid-123' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { supabase_user_id: 'uuid-123' },
      })
    );
  });

  it('stores empty string in metadata when userId is omitted', async () => {
    await POST(makeRequest({ email: 'user@example.com' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { supabase_user_id: '' },
      })
    );
  });

  it('charges $19.99 (1999 cents) on a 3-month recurring interval', async () => {
    await POST(makeRequest({ email: 'user@example.com' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 1999,
              // The interval is load-bearing: Stripe has no 'quarter', so a
              // 3-month cycle is interval 'month' with interval_count 3. It
              // must match the App Store subscription period, or web and
              // in-app customers get different amounts of access for $19.99.
              recurring: { interval: 'month', interval_count: 3 },
              product_data: expect.objectContaining({
                name: 'The Executive Meditator',
              }),
            }),
          }),
        ]),
      })
    );
  });

  it('puts supabase_user_id on the SUBSCRIPTION, not just the session', async () => {
    // Renewal events arrive against the subscription and carry no session, so
    // without this a renewal three months later cannot be attributed to a user.
    await POST(makeRequest({ email: 'user@example.com', userId: 'uuid-123' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: { metadata: { supabase_user_id: 'uuid-123' } },
      })
    );
  });

  it('IGNORES a corporate tier request and still charges $19.99', async () => {
    // The corporate tier was removed 2026-08-29 (Apple Guideline 3.1.3(c)).
    // A stale client or a hand-crafted request must not be able to select a
    // price we no longer offer — the route ignores `tier` entirely rather than
    // mapping unknown values, so there is no path back to $500.
    await POST(makeRequest({ email: 'user@example.com', tier: 'corporate' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 1999,
              product_data: expect.objectContaining({
                name: 'The Executive Meditator',
              }),
            }),
          }),
        ]),
      })
    );
  });

  it('no longer records a tier in Stripe metadata', async () => {
    await POST(makeRequest({ email: 'user@example.com', userId: 'uuid-abc' }));
    const call = mockStripe.create.mock.calls[0][0];
    expect(call.metadata).toEqual({ supabase_user_id: 'uuid-abc' });
    expect(call.metadata.tier).toBeUndefined();
  });

  it('ignores any tier value in the request body', async () => {
    // There is only one price now, so `tier` is not read at all. Previously
    // unknown values fell back to individual; today nothing can select a price.
    await POST(makeRequest({ email: 'user@example.com', tier: 'enterprise-unicorn' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 1999 }),
          }),
        ]),
      })
    );
  });

  it('returns 500 when Stripe throws', async () => {
    mockStripe.create.mockRejectedValue(new Error('Stripe error'));
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(500);
  });
});
