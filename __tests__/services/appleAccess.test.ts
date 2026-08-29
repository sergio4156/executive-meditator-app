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

// Must be installed BEFORE the module is required — the module reads env at
// import time and would otherwise throw on a missing global.
(globalThis as unknown as {Deno: unknown}).Deno = {
  env: {get: () => 'test-value'},
};

const {
  APPLE_STATUS,
  accessExpiryFor,
  decodeJwsPayload,
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
