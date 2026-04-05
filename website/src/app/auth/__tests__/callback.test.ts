import { NextRequest } from 'next/server';

const mockExchangeCode = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCode },
  })),
}));

import { GET } from '../callback/route';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/auth/callback');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

describe('GET /auth/callback', () => {
  it('redirects to /setup?error=verification_failed when no code is present', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('verification_failed');
  });

  it('redirects to /setup/confirmed on successful code exchange', async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    const res = await GET(makeRequest({ code: 'valid-code' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/setup/confirmed');
  });

  it('redirects to custom next param on success', async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    const res = await GET(makeRequest({ code: 'valid-code', next: '/dashboard' }));
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('redirects to error page when code exchange fails', async () => {
    mockExchangeCode.mockResolvedValue({ error: new Error('invalid code') });
    const res = await GET(makeRequest({ code: 'bad-code' }));
    expect(res.headers.get('location')).toContain('verification_failed');
  });
});
