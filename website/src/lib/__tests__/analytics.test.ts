/**
 * Tests for server-side purchase analytics.
 *
 * This code sits in the PAYMENT path. The failure that matters most is not a
 * wrong number — it is trackPurchase throwing and taking the Stripe webhook
 * down with it, because the webhook returning non-200 makes Stripe retry, and
 * a retried webhook risks duplicate handling of money that already moved.
 * Several tests below exist purely to pin down "never throws".
 *
 * The second class of bug is silent misreporting: Stripe reports minor units
 * (1234) and GA4 expects major units (12.34). A missing /100 would overstate
 * revenue by 100x in a dashboard someone eventually shows an investor.
 */
import { trackPurchase } from '../analytics';

const ORIGINAL_ENV = process.env;

describe('trackPurchase', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.GA4_MEASUREMENT_ID = 'G-TEST123';
    process.env.GA4_API_SECRET = 'secret-abc';

    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  /** Parse the JSON body handed to fetch, so assertions read clearly. */
  function sentBody() {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
  }

  describe('configuration gating', () => {
    it('no-ops when neither env var is set', async () => {
      delete process.env.GA4_MEASUREMENT_ID;
      delete process.env.GA4_API_SECRET;

      await trackPurchase({ userId: 'user-1' });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('no-ops when only the measurement ID is set', async () => {
      delete process.env.GA4_API_SECRET;

      await trackPurchase({ userId: 'user-1' });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('no-ops when only the API secret is set', async () => {
      delete process.env.GA4_MEASUREMENT_ID;

      await trackPurchase({ userId: 'user-1' });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('request shape', () => {
    it('posts to the GA4 endpoint with credentials in the query string', async () => {
      await trackPurchase({ userId: 'user-1' });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('https://www.google-analytics.com/mp/collect');
      expect(url).toContain('measurement_id=G-TEST123');
      expect(url).toContain('api_secret=secret-abc');
      expect(init.method).toBe('POST');
    });

    it('sends a single purchase_completed event', async () => {
      await trackPurchase({ userId: 'user-1' });

      const body = sentBody();
      expect(body.events).toHaveLength(1);
      expect(body.events[0].name).toBe('purchase_completed');
    });

    it('uses the Supabase user id as both client_id and user_id', async () => {
      // We have no browser client id here and deliberately set no cookie to get
      // one; the user id is the join key that ties a purchase to in-app events.
      await trackPurchase({ userId: 'user-abc' });

      const body = sentBody();
      expect(body.client_id).toBe('user-abc');
      expect(body.user_id).toBe('user-abc');
    });

    it('never sends an email address or other PII', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 1000, currency: 'usd' });

      expect(JSON.stringify(sentBody())).not.toContain('@');
    });
  });

  describe('amount conversion', () => {
    it('converts Stripe minor units to GA4 major units', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 1234 });

      expect(sentBody().events[0].params.value).toBe(12.34);
    });

    it('handles a whole-dollar amount', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 1000 });

      expect(sentBody().events[0].params.value).toBe(10);
    });

    it('sends value 0 rather than omitting it for a zero amount', async () => {
      // A 100%-off promo is a real purchase event; dropping it would understate
      // conversion counts even though revenue is genuinely zero.
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 0 });

      expect(sentBody().events[0].params.value).toBe(0);
    });

    it('omits value when the amount is null', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: null });

      expect(sentBody().events[0].params).not.toHaveProperty('value');
    });

    it('omits value when the amount is absent', async () => {
      await trackPurchase({ userId: 'user-1' });

      expect(sentBody().events[0].params).not.toHaveProperty('value');
    });
  });

  describe('currency', () => {
    it('uppercases the currency code Stripe reports in lowercase', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 1000, currency: 'usd' });

      expect(sentBody().events[0].params.currency).toBe('USD');
    });

    it('omits currency when absent', async () => {
      await trackPurchase({ userId: 'user-1', amountMinorUnits: 1000 });

      expect(sentBody().events[0].params).not.toHaveProperty('currency');
    });
  });

  describe('never breaks the payment path', () => {
    it('does not throw when the network call rejects', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      await expect(trackPurchase({ userId: 'user-1' })).resolves.toBeUndefined();
    });

    it('does not throw when GA4 rejects the event', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401 });

      await expect(trackPurchase({ userId: 'user-1' })).resolves.toBeUndefined();
    });

    it('does not throw when fetch is unavailable entirely', async () => {
      global.fetch = undefined as unknown as typeof fetch;

      await expect(trackPurchase({ userId: 'user-1' })).resolves.toBeUndefined();
    });
  });
});
