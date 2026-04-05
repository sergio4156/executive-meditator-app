import { NextRequest } from 'next/server';

const mockCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: mockCreate },
    },
  }));
});

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
  mockCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' });
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
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer_email: 'user@example.com',
      })
    );
  });

  it('charges $500 (50000 cents)', async () => {
    await POST(makeRequest({ email: 'user@example.com' }));
    expect(mockCreate).toHaveBeenCalledWith(
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
    mockCreate.mockRejectedValue(new Error('Stripe error'));
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(500);
  });
});
