import { NextRequest } from 'next/server';

// Mock Supabase
const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// Mock Resend
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { POST } from '../route';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.NOTIFICATION_EMAIL = 'admin@test.com';
  mockInsert.mockResolvedValue({ error: null });
  mockSend.mockResolvedValue({ id: 'email-id' });
});

describe('POST /api/contact', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ name: 'John' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 200 and saves to Supabase on valid submission', async () => {
    const res = await POST(makeRequest({
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      licenses: '10',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'John Doe', company: 'Acme Corp', email: 'john@acme.com' }),
    ]);
  });

  it('sends email notification on valid submission', async () => {
    await POST(makeRequest({
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      licenses: '10',
    }));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['admin@test.com'],
        subject: expect.stringContaining('Acme Corp'),
      })
    );
  });

  it('returns 500 when Supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') });
    const res = await POST(makeRequest({
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      licenses: '10',
    }));
    expect(res.status).toBe(500);
  });

  it('supports multiple notification email recipients', async () => {
    process.env.NOTIFICATION_EMAIL = 'admin@test.com,other@test.com';
    await POST(makeRequest({
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      licenses: '10',
    }));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['admin@test.com', 'other@test.com'] })
    );
  });
});
