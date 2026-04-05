import { NextRequest } from 'next/server';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { POST } from '../route';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notify-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.NOTIFICATION_EMAIL = 'admin@test.com';
  mockSend.mockResolvedValue({ id: 'email-id' });
});

describe('POST /api/notify-signup', () => {
  it('returns success and sends notification email', async () => {
    const res = await POST(makeRequest({ fullName: 'Jane Doe', email: 'jane@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Jane Doe'),
        to: ['admin@test.com'],
      })
    );
  });

  it('still returns success when Resend is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makeRequest({ fullName: 'Jane Doe', email: 'jane@example.com' }));
    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends to multiple notification recipients', async () => {
    process.env.NOTIFICATION_EMAIL = 'admin@test.com,other@test.com';
    await POST(makeRequest({ fullName: 'Jane Doe', email: 'jane@example.com' }));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['admin@test.com', 'other@test.com'] })
    );
  });
});
