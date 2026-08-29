import { NextRequest } from 'next/server';

// ── Supabase mock ──────────────────────────────────────────────────────────
// The route does a two-step flow per checkout event:
//   1. from('profiles').select(...).eq(...)   → profile lookup (idempotency)
//   2. from('profiles').update(...).eq(...)    → mark paid
// select().eq() resolves to { data, error }; update().eq() resolves to { error }.
const mockSelectEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockSelectEq }));
const mockUpdateEq = jest.fn();
// Typed with a rest parameter so `mock.calls[0][0]` is inspectable. Without it
// TypeScript infers the call tuple as empty and every assertion on the update
// payload is a compile error.
const mockUpdate = jest.fn((..._args: any[]) => ({ eq: mockUpdateEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect, update: mockUpdate }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// ── Resend mock ────────────────────────────────────────────────────────────
const mockSendEmail = jest.fn().mockResolvedValue({});
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSendEmail },
  })),
}));

// ── Stripe mock ────────────────────────────────────────────────────────────
// The checkout handler now retrieves the subscription to learn the billing
// period, so subscriptions.retrieve has to be mocked too.
const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  })),
}));

/** 2026-11-27T00:00:00Z — a period end roughly 3 months out, in UNIX seconds. */
const PERIOD_END_SECONDS = 1795737600;
const PERIOD_END_ISO = new Date(PERIOD_END_SECONDS * 1000).toISOString();

// ── Analytics mock ─────────────────────────────────────────────────────────
// Same specifier the route uses, so both resolve to src/lib/analytics.
const mockTrackPurchase = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../lib/analytics', () => ({
  trackPurchase: (...args: unknown[]) => mockTrackPurchase(...args),
}));

import { POST } from '../webhook/route';

function makeCheckoutEvent(overrides: object = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer_email: 'user@example.com',
        metadata: { supabase_user_id: 'uuid-abc' },
        // Checkout is now mode:'subscription', so every real session carries
        // one. The handler needs it to look up the billing period.
        subscription: 'sub_test_123',
        ...overrides,
      },
    },
  };
}

function makeRequest(body: object, signature = 'sig') {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: JSON.stringify(body),
  });
}

// Default: an unpaid profile is found, and the update succeeds.
function primeUnpaidProfile() {
  mockSelectEq.mockResolvedValue({
    data: [{ user_id: 'uuid-abc', is_paid: false, stripe_session_id: null }],
    error: null,
  });
  mockUpdateEq.mockResolvedValue({ error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.RESEND_API_KEY = 're_test_fake';
  // No webhook secret set → raw JSON parse path (simpler for unit tests)
  delete process.env.STRIPE_WEBHOOK_SECRET;
  primeUnpaidProfile();
  mockSubscriptionsRetrieve.mockResolvedValue({
    id: 'sub_test_123',
    current_period_end: PERIOD_END_SECONDS,
  });
});

describe('POST /api/stripe/webhook', () => {
  it('returns 500 when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(500);
  });

  it('marks user as paid using supabase_user_id from metadata', async () => {
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelectEq).toHaveBeenCalledWith('user_id', 'uuid-abc');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_paid: true, stripe_session_id: 'cs_test_123' })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'uuid-abc');
  });

  it('sends download email after successful payment', async () => {
    await POST(makeRequest(makeCheckoutEvent()));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' })
    );
  });

  it('falls back to email lookup when supabase_user_id is missing', async () => {
    // Profile is found by email instead of user_id.
    mockSelectEq.mockResolvedValue({
      data: [{ user_id: 'uuid-from-email', is_paid: false, stripe_session_id: null }],
      error: null,
    });
    const res = await POST(makeRequest(makeCheckoutEvent({ metadata: {} })));
    expect(res.status).toBe(200);
    expect(mockSelectEq).toHaveBeenCalledWith('email', 'user@example.com');
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'uuid-from-email');
  });

  it('returns 500 when the session has neither user_id nor email', async () => {
    const res = await POST(
      makeRequest(makeCheckoutEvent({ metadata: {}, customer_email: null }))
    );
    expect(res.status).toBe(500);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when no profile matches (so Stripe retries)', async () => {
    mockSelectEq.mockResolvedValue({ data: [], error: null });
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(500);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('PROCESSES a new checkout for someone who has paid before (resubscription)', async () => {
    // Behaviour deliberately changed with the subscription model. The old
    // version bailed whenever is_paid was true, which was right for a one-time
    // purchase — but is_paid stays true forever once someone has paid, so that
    // guard would now reject every returning customer. Idempotency is keyed on
    // the session id alone.
    mockSelectEq.mockResolvedValue({
      data: [
        {
          user_id: 'uuid-abc',
          is_paid: true,
          stripe_session_id: 'cs_old',
          paid_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const res = await POST(makeRequest(makeCheckoutEvent()));

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('does NOT overwrite paid_at for a returning customer', async () => {
    // paid_at anchors the 21-day program. Rewriting it on resubscription would
    // restart a long-standing user at Week 1.
    mockSelectEq.mockResolvedValue({
      data: [
        {
          user_id: 'uuid-abc',
          is_paid: true,
          stripe_session_id: 'cs_old',
          paid_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });

    await POST(makeRequest(makeCheckoutEvent()));

    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('paid_at');
  });

  it('sets paid_at on a first purchase', async () => {
    await POST(makeRequest(makeCheckoutEvent()));
    expect(mockUpdate.mock.calls[0][0]).toHaveProperty('paid_at');
  });

  it('records the access expiry and subscription from the Stripe period', async () => {
    await POST(makeRequest(makeCheckoutEvent()));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        access_expires_at: PERIOD_END_ISO,
        subscription_provider: 'stripe',
        subscription_id: 'sub_test_123',
      })
    );
  });

  it('returns 500 when a checkout session carries no subscription', async () => {
    // Non-200 so Stripe retries. Acking would leave a paying customer with no
    // expiry set, and therefore no access.
    const res = await POST(makeRequest(makeCheckoutEvent({ subscription: null })));
    expect(res.status).toBe(500);
  });

  it('extends access on a renewal invoice', async () => {
    const res = await POST(
      makeRequest({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_1',
            subscription: 'sub_test_123',
            lines: { data: [{ period: { end: PERIOD_END_SECONDS } }] },
          },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ access_expires_at: PERIOD_END_ISO, is_paid: true }),
      expect.objectContaining({ count: 'exact' })
    );
  });

  it('returns 500 when a renewal matches no profile', async () => {
    // Someone is being charged while their access silently lapses — that has
    // to surface rather than be acked.
    mockUpdateEq.mockResolvedValue({ error: null, count: 0 });

    const res = await POST(
      makeRequest({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_1',
            subscription: 'sub_unknown',
            lines: { data: [{ period: { end: PERIOD_END_SECONDS } }] },
          },
        },
      })
    );

    expect(res.status).toBe(500);
  });

  it('expires access when a subscription is cancelled', async () => {
    const res = await POST(
      makeRequest({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_test_123' } },
      })
    );

    expect(res.status).toBe(200);
    const update = mockUpdate.mock.calls[0][0];
    // Expiry set to now-ish, and the subscription link cleared.
    expect(new Date(update.access_expires_at).getTime()).toBeLessThanOrEqual(Date.now());
    expect(update.subscription_id).toBeNull();
    // is_paid stays true — it means "has ever paid", and clearing it would
    // lose the fact they were once a customer.
    expect(update).not.toHaveProperty('is_paid');
  });

  it('is idempotent: same session id already recorded is not reprocessed', async () => {
    mockSelectEq.mockResolvedValue({
      data: [{ user_id: 'uuid-abc', is_paid: false, stripe_session_id: 'cs_test_123' }],
      error: null,
    });
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('reports the purchase to analytics with the amount and currency', async () => {
    const res = await POST(
      makeRequest(makeCheckoutEvent({ amount_total: 1000, currency: 'usd' })),
    );
    expect(res.status).toBe(200);
    expect(mockTrackPurchase).toHaveBeenCalledWith({
      userId: 'uuid-abc',
      amountMinorUnits: 1000,
      currency: 'usd',
    });
  });

  it('does NOT report the purchase again on a Stripe retry', async () => {
    // The single most important assertion here: analytics sits AFTER the
    // idempotency guard. Stripe retries webhooks, and a purchase counted twice
    // would overstate revenue in a dashboard nobody cross-checks until it is
    // being shown to someone who matters.
    mockSelectEq.mockResolvedValue({
      data: [{ user_id: 'uuid-abc', is_paid: true, stripe_session_id: 'cs_test_123' }],
      error: null,
    });

    await POST(makeRequest(makeCheckoutEvent({ amount_total: 1000, currency: 'usd' })));

    expect(mockTrackPurchase).not.toHaveBeenCalled();
  });

  it('does NOT report a purchase when the DB update fails', async () => {
    // The webhook 500s so Stripe retries; counting a purchase whose payment we
    // failed to record would put analytics and the database permanently out of
    // agreement.
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });

    const res = await POST(makeRequest(makeCheckoutEvent({ amount_total: 1000 })));

    expect(res.status).toBe(500);
    expect(mockTrackPurchase).not.toHaveBeenCalled();
  });

  it('does not reset paid_at on a duplicate event (no update when already paid)', async () => {
    mockSelectEq.mockResolvedValue({
      data: [{ user_id: 'uuid-abc', is_paid: true, stripe_session_id: 'cs_test_123' }],
      error: null,
    });
    await POST(makeRequest(makeCheckoutEvent()));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('skips email when customer_email is null but still marks paid', async () => {
    const res = await POST(makeRequest(makeCheckoutEvent({ customer_email: null })));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_paid: true })
    );
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 500 when the DB update fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: new Error('DB error') });
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(500);
  });

  it('still returns 200 (payment recorded) when the welcome email throws', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('Resend down'));
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('returns 200 received:true on success', async () => {
    const res = await POST(makeRequest(makeCheckoutEvent()));
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });

  it('ignores non-checkout event types', async () => {
    const event = { type: 'payment_intent.created', data: { object: {} } };
    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
