import { NextRequest } from 'next/server';

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockUpdate = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockResolvedValue({ error: null });
const mockFrom = jest.fn(() => ({ update: mockUpdate }));
mockUpdate.mockReturnValue({ eq: mockEq });

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

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.RESEND_API_KEY = 're_test_fake';
  // No webhook secret set → raw JSON parse path (simpler for unit tests)
  delete process.env.STRIPE_WEBHOOK_SECRET;
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
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_paid: true })
    );
    expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-abc');
  });

  it('sends download email after successful payment', async () => {
    await POST(makeRequest(makeCheckoutEvent()));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' })
    );
  });

  it('skips DB update when supabase_user_id is missing from metadata', async () => {
    const event = makeCheckoutEvent({ metadata: {} });
    await POST(makeRequest(event));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('skips email when customer_email is null', async () => {
    const event = makeCheckoutEvent({ customer_email: null });
    await POST(makeRequest(event));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 500 when DB update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: new Error('DB error') });
    const res = await POST(makeRequest(makeCheckoutEvent()));
    expect(res.status).toBe(500);
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
