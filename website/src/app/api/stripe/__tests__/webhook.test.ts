import { NextRequest } from 'next/server';

// ── Supabase mock ──────────────────────────────────────────────────────────
// The route does a two-step flow per checkout event:
//   1. from('profiles').select(...).eq(...)   → profile lookup (idempotency)
//   2. from('profiles').update(...).eq(...)    → mark paid
// select().eq() resolves to { data, error }; update().eq() resolves to { error }.
const mockSelectEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockSelectEq }));
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
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
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  })),
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

  it('is idempotent: already-paid profile is not updated or re-emailed', async () => {
    mockSelectEq.mockResolvedValue({
      data: [{ user_id: 'uuid-abc', is_paid: true, stripe_session_id: 'cs_old' }],
      error: null,
    });
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, idempotent: true });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
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
