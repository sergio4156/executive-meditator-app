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
        mode: 'payment',
        customer_email: 'user@example.com',
      })
    );
  });

  it('charges $500 (50000 cents)', async () => {
    await POST(makeRequest({ email: 'user@example.com' }));
    expect(mockStripe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 50000 }),
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
