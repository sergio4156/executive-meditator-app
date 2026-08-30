/**
 * Tests for the App Store entitlement decision.
 *
 * `accessExpiryFor` is the single function that turns Apple's answer into
 * "until when may this person use the app". Every way it can be wrong is
 * expensive in one direction or the other: too permissive and refunds become
 * free subscriptions, too strict and a customer whose card declined once is
 * locked out of something they are still paying for.
 *
 * The module under test is a Deno Edge Function module. It touches `Deno.env`
 * at import time, so the shim below stands in for the runtime; nothing else
 * about the module is Deno-specific.
 */

// A real P-256 key, generated synchronously so it can be in place before the
// module is required. Using a genuine key rather than a stub means the tests
// exercise the actual PKCS8 import and ES256 signing path — the part most
// likely to be subtly wrong, and the part that fails identically for every
// customer when it is.
const {generateKeyPairSync} = require('crypto');
const {privateKey: TEST_PEM} = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
  publicKeyEncoding: {type: 'spki', format: 'pem'},
});

const TEST_BUNDLE_ID = 'com.executivemeditator.app';

// Must be installed BEFORE the module is required — the module reads env at
// import time and would otherwise throw on a missing global.
(globalThis as unknown as {Deno: unknown}).Deno = {
  env: {
    get: (key: string) =>
      ({
        APPLE_IAP_KEY_ID: 'TESTKEY123',
        APPLE_IAP_ISSUER_ID: '00000000-0000-0000-0000-000000000000',
        APPLE_IAP_PRIVATE_KEY: TEST_PEM,
        APPLE_BUNDLE_ID: TEST_BUNDLE_ID,
      }[key] ?? 'test-value'),
  },
};

const {
  APPLE_STATUS,
  AppStoreAuthError,
  accessExpiryFor,
  decodeJwsPayload,
  getSubscriptionStatus,
} = require('../../supabase/functions/_shared/appstore.ts');

interface AppleSubscription {
  originalTransactionId: string;
  productId: string;
  status: number;
  expiresAt: string | null;
  revokedAt: string | null;
  environment: 'Production' | 'Sandbox';
}

const FUTURE = '2030-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

function sub(overrides: Partial<AppleSubscription> = {}): AppleSubscription {
  return {
    originalTransactionId: '2000000123456789',
    productId: 'com.executivemeditator.access.3month',
    status: APPLE_STATUS.ACTIVE,
    expiresAt: FUTURE,
    revokedAt: null,
    environment: 'Production',
    ...overrides,
  };
}

describe('accessExpiryFor', () => {
  it('grants access until Apple\'s expiry for an active subscription', () => {
    expect(accessExpiryFor(sub())).toBe(FUTURE);
  });

  it('keeps access during a billing retry', () => {
    // Apple has not been paid yet but is still trying. Cutting off a customer
    // over one declined card, then restoring them days later, is worse for
    // them than the few days of access it saves.
    expect(accessExpiryFor(sub({status: APPLE_STATUS.BILLING_RETRY}))).toBe(
      FUTURE,
    );
  });

  it('keeps access during a billing grace period', () => {
    expect(accessExpiryFor(sub({status: APPLE_STATUS.GRACE_PERIOD}))).toBe(
      FUTURE,
    );
  });

  it('ends access now when the subscription has expired', () => {
    const result = accessExpiryFor(
      sub({status: APPLE_STATUS.EXPIRED, expiresAt: PAST}),
    );
    // "Now", not Apple's past date — both lock the user out, but now is
    // unambiguous in logs and does not depend on Apple supplying expiresDate.
    expect(new Date(result).getTime()).toBeLessThanOrEqual(Date.now());
    expect(result).not.toBe(PAST);
  });

  it('ends access now when the subscription was revoked', () => {
    const result = accessExpiryFor(sub({status: APPLE_STATUS.REVOKED}));
    expect(new Date(result).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('REVOCATION BEATS AN ACTIVE STATUS AND A FUTURE EXPIRY', () => {
    // The refund case. Apple can report status 1 with a future expiresDate
    // while also carrying a revocationDate; honouring the expiry there would
    // turn every refund into a free subscription.
    const revokedAt = '2026-06-01T00:00:00.000Z';
    expect(
      accessExpiryFor(
        sub({status: APPLE_STATUS.ACTIVE, expiresAt: FUTURE, revokedAt}),
      ),
    ).toBe(revokedAt);
  });

  it('grants nothing for an unrecognised status', () => {
    // A status code Apple adds later must fail closed, not default to active.
    expect(accessExpiryFor(sub({status: 99}))).toBeNull();
  });

  it('grants nothing when an active subscription has no expiry date', () => {
    // Without an expiry there is no date to write, and hasActiveAccess treats
    // null as no access — so returning null here is the honest answer rather
    // than inventing a date.
    expect(accessExpiryFor(sub({expiresAt: null}))).toBeNull();
  });
});

describe('getSubscriptionStatus — separating "not found" from "we are broken"', () => {
  const originalFetch = global.fetch;

  function jws(payload: object): string {
    const enc = (v: object) =>
      Buffer.from(JSON.stringify(v))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]+$/, '');
    return `${enc({alg: 'ES256'})}.${enc(payload)}.sig`;
  }

  function reply(status: number, body: unknown = {}) {
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('THROWS when BOTH environments reject the credentials', async () => {
    // The distinction that matters. Collapsing this into null would report a
    // broken signing key as "your transaction is not recognised", sending every
    // debugging effort after the customer's purchase instead of our config —
    // while every purchase in production silently fails.
    const fetchMock = jest.fn(() => reply(401, {errorCode: 4010000}));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getSubscriptionStatus('2000000123456789')).rejects.toThrow(
      AppStoreAuthError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('FALLS BACK TO SANDBOX ON A PRODUCTION 401, NOT JUST A 404', async () => {
    // Verified against Apple 2026-08-29: with a fake transaction id and a valid
    // key, production answers 401 and sandbox answers 404. Apple's production
    // endpoint rejects apps with no production presence — the state of every
    // unreleased app.
    //
    // Treating that 401 as fatal breaks the case that matters most: App Review
    // and TestFlight both transact in SANDBOX, so a reviewer's purchase would
    // fail verification and the build would be rejected for the very feature it
    // was submitted to add.
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => reply(401, {}))
      .mockImplementationOnce(() =>
        reply(200, {
          bundleId: TEST_BUNDLE_ID,
          data: [
            {
              lastTransactions: [
                {
                  status: APPLE_STATUS.ACTIVE,
                  signedTransactionInfo: jws({
                    originalTransactionId: '2000000123456789',
                    bundleId: TEST_BUNDLE_ID,
                    expiresDate: 1893456000000,
                  }),
                },
              ],
            },
          ],
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getSubscriptionStatus('2000000123456789');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).not.toBeNull();
    expect(result.environment).toBe('Sandbox');
  });

  it('returns null when production 401s and sandbox genuinely has no such transaction', async () => {
    // The exact shape of the live probe. Must be "unknown transaction", not a
    // credentials error — the credentials are demonstrably fine.
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => reply(401, {}))
      .mockImplementationOnce(() => reply(404, {errorCode: 4040010}));
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await getSubscriptionStatus('9999999999999999')).toBeNull();
  });

  it('falls back to sandbox on a production 404', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => reply(404, {}))
      .mockImplementationOnce(() =>
        reply(200, {
          bundleId: TEST_BUNDLE_ID,
          data: [
            {
              lastTransactions: [
                {
                  status: APPLE_STATUS.ACTIVE,
                  signedTransactionInfo: jws({
                    originalTransactionId: '2000000123456789',
                    productId: 'com.executivemeditator.access.3month',
                    bundleId: TEST_BUNDLE_ID,
                    expiresDate: 1893456000000,
                  }),
                },
              ],
            },
          ],
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getSubscriptionStatus('2000000123456789');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // TestFlight and App Review both transact in sandbox, so this fallback is
    // what makes review work against the deployed function with no config flag.
    expect(result.environment).toBe('Sandbox');
    expect(result.status).toBe(APPLE_STATUS.ACTIVE);
  });

  it('returns null only when BOTH environments report not found', async () => {
    const fetchMock = jest.fn(() => reply(404, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await getSubscriptionStatus('2000000123456789')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on a 500 rather than blaming the caller', async () => {
    // An Apple outage is not evidence the purchase is fake.
    const fetchMock = jest.fn(() => reply(500, {}));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(getSubscriptionStatus('2000000123456789')).rejects.toThrow(
      AppStoreAuthError,
    );
  });

  it('rejects a transaction belonging to a different bundle id', async () => {
    const fetchMock = jest.fn(() =>
      reply(200, {bundleId: 'com.someone.else', data: []}),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await getSubscriptionStatus('2000000123456789')).toBeNull();
  });

  it('signs a real ES256 bearer token and sends it', async () => {
    // Exercises the genuine PKCS8 import and WebCrypto signing path. If the
    // key parsing or base64url encoding were wrong this would throw here rather
    // than failing against Apple for every real customer.
    let sentAuth = '';
    const fetchMock = jest.fn((_url: string, init: {headers: Record<string, string>}) => {
      sentAuth = init.headers.Authorization;
      return reply(404, {});
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await getSubscriptionStatus('2000000123456789');

    expect(sentAuth).toMatch(/^Bearer /);
    const [header, payload] = sentAuth
      .replace('Bearer ', '')
      .split('.')
      .slice(0, 2)
      .map(p => JSON.parse(Buffer.from(p, 'base64url').toString()));
    expect(header).toMatchObject({alg: 'ES256', kid: 'TESTKEY123', typ: 'JWT'});
    // `bid` is required by Apple for App Store Server API tokens; without it
    // the request is rejected as unauthorized.
    expect(payload).toMatchObject({
      aud: 'appstoreconnect-v1',
      bid: TEST_BUNDLE_ID,
    });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(3600);
  });
});

describe('decodeJwsPayload', () => {
  function makeJws(payload: object): string {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        // Character class rather than a bare `=`, which ESLint flags as
        // confusable with the `/=` operator (no-div-regex).
        .replace(/[=]+$/, '');
    return `${encode({alg: 'ES256'})}.${encode(payload)}.fake-signature`;
  }

  it('reads the payload out of a three-part JWS', () => {
    const payload = {originalTransactionId: '2000000123456789', expiresDate: 1};
    expect(decodeJwsPayload(makeJws(payload))).toEqual(payload);
  });

  it('decodes base64url, not plain base64', () => {
    // Payloads containing '-' or '_' after encoding are decoded incorrectly by
    // a plain atob, which would silently drop real transactions.
    const payload = {productId: 'a?b>c~d', note: 'ÿÿÿ'};
    expect(decodeJwsPayload(makeJws(payload))).toEqual(payload);
  });

  it('returns null for a malformed JWS rather than throwing', () => {
    expect(decodeJwsPayload('not-a-jws')).toBeNull();
    expect(decodeJwsPayload('one.two')).toBeNull();
    expect(decodeJwsPayload('a.!!!not-base64!!!.c')).toBeNull();
  });
});
