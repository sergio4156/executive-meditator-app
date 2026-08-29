/**
 * App Store Server API client — shared by `verify-apple-purchase` and
 * `apple-notifications`.
 *
 * WHY THIS EXISTS AT ALL
 * The app tells us "I bought a subscription". That claim is worth nothing: a
 * jailbroken device, a patched binary, or a plain HTTP client can send the same
 * request. The only trustworthy answer comes from Apple, so every entitlement
 * decision in this codebase routes through `getSubscriptionStatus` below, which
 * asks Apple over an authenticated TLS connection.
 *
 * WHY NOT `verifyReceipt`
 * The old `/verifyReceipt` endpoint takes a base64 receipt blob from the
 * client. It still works, but it is deprecated, it returns the entire purchase
 * history when we want one subscription's current state, and it means parsing a
 * client-supplied blob. The App Store Server API answers the actual question —
 * "is this subscription active right now, and until when" — directly.
 *
 * REQUIRED SUPABASE SECRETS
 *   APPLE_IAP_KEY_ID       Key ID of the In-App Purchase key
 *   APPLE_IAP_ISSUER_ID    Issuer ID from App Store Connect → Integrations
 *   APPLE_IAP_PRIVATE_KEY  Full contents of the .p8, including the BEGIN/END lines
 *   APPLE_BUNDLE_ID        e.g. com.executivemeditator.app
 *
 * NOTE the In-App Purchase key is NOT the same key used to upload builds. It is
 * generated separately under App Store Connect → Users and Access →
 * Integrations → In-App Purchase, and the upload key will not work here.
 */

const KEY_ID = Deno.env.get('APPLE_IAP_KEY_ID')!;
const ISSUER_ID = Deno.env.get('APPLE_IAP_ISSUER_ID')!;
const PRIVATE_KEY_PEM = Deno.env.get('APPLE_IAP_PRIVATE_KEY')!;
export const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID')!;

const PRODUCTION_BASE = 'https://api.storekit.itunes.apple.com';
const SANDBOX_BASE = 'https://api.storekit-sandbox.itunes.apple.com';

/**
 * Apple's subscription status codes.
 * https://developer.apple.com/documentation/appstoreserverapi/status
 */
export const APPLE_STATUS = {
  ACTIVE: 1,
  EXPIRED: 2,
  /** Billing failed; Apple is retrying. Access should continue for now. */
  BILLING_RETRY: 3,
  /** Billing failed but the user is in a billing grace period. */
  GRACE_PERIOD: 4,
  /** Refunded or revoked (including Family Sharing removal). Access ends. */
  REVOKED: 5,
} as const;

export interface AppleSubscription {
  /** Stable across renewals — this identifies the subscription, not a payment. */
  originalTransactionId: string;
  productId: string;
  /** Apple's status code; see APPLE_STATUS. */
  status: number;
  /** When access ends, ISO 8601. Null if Apple did not supply one. */
  expiresAt: string | null;
  /** Set when refunded or revoked. Access must end immediately. */
  revokedAt: string | null;
  environment: 'Production' | 'Sandbox';
}

/* ------------------------------------------------------------------ */
/* Signing                                                             */
/* ------------------------------------------------------------------ */

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

/** Decode a base64url segment (JWS payloads use base64url, not base64). */
function base64UrlDecodeString(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

let cachedKey: CryptoKey | null = null;

/**
 * Import the .p8 as an ES256 signing key.
 *
 * Cached for the life of the isolate: importing on every request would add a
 * key parse to every call for no benefit, and the key never changes.
 */
async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  // Tolerate the PEM arriving with literal "\n" sequences — pasting a .p8 into
  // a dashboard secret field commonly escapes the newlines, and the resulting
  // key would otherwise fail to parse with a misleading error.
  const pem = PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));

  cachedKey = await crypto.subtle.importKey(
    'pkcs8',
    der,
    {name: 'ECDSA', namedCurve: 'P-256'},
    false,
    ['sign'],
  );
  return cachedKey;
}

/**
 * Build the bearer token the App Store Server API requires.
 *
 * Apple rejects tokens with a lifetime over 60 minutes. A short life is used
 * here because the token is minted per request anyway.
 */
async function createBearerToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {alg: 'ES256', kid: KEY_ID, typ: 'JWT'};
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
    // Apple requires the bundle id in the claim for App Store Server API
    // tokens; without it the request is rejected as unauthorized.
    bid: BUNDLE_ID,
  };

  const signingInput = `${base64UrlEncodeString(
    JSON.stringify(header),
  )}.${base64UrlEncodeString(JSON.stringify(payload))}`;

  const signature = await crypto.subtle.sign(
    {name: 'ECDSA', hash: 'SHA-256'},
    await getSigningKey(),
    new TextEncoder().encode(signingInput),
  );

  // WebCrypto emits ECDSA signatures as raw r||s, which is exactly what JWS
  // wants. (Some other libraries emit DER, which would need conversion.)
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/* ------------------------------------------------------------------ */
/* JWS payload decoding                                                */
/* ------------------------------------------------------------------ */

/**
 * Read the payload out of a JWS without verifying its signature.
 *
 * SAFE ONLY for payloads that arrived inside an authenticated HTTPS response
 * from Apple — TLS plus our bearer token already establish that Apple sent
 * them, so re-verifying the embedded signature would prove nothing new.
 *
 * NEVER call this on a payload that arrived in an inbound request. Anyone can
 * POST to a public endpoint. `apple-notifications` deliberately does not treat
 * decoded notification data as fact; see the comment there.
 */
export function decodeJwsPayload<T>(jws: string): T | null {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecodeString(parts[1])) as T;
  } catch {
    return null;
  }
}

interface TransactionPayload {
  originalTransactionId?: string;
  productId?: string;
  bundleId?: string;
  /** Milliseconds since epoch. */
  expiresDate?: number;
  /** Milliseconds since epoch; present only for refunds/revocations. */
  revocationDate?: number;
}

interface LastTransaction {
  originalTransactionId?: string;
  status?: number;
  signedTransactionInfo?: string;
}

interface StatusResponse {
  environment?: string;
  bundleId?: string;
  data?: Array<{lastTransactions?: LastTransaction[]}>;
}

/** Milliseconds-since-epoch → ISO, or null. Apple uses ms, not seconds. */
function msToIso(ms: number | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/* ------------------------------------------------------------------ */
/* The one query we make                                               */
/* ------------------------------------------------------------------ */

async function fetchStatus(
  base: string,
  transactionId: string,
  token: string,
): Promise<Response> {
  return await fetch(
    `${base}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`,
    {headers: {Authorization: `Bearer ${token}`}},
  );
}

/**
 * Ask Apple for the current state of a subscription.
 *
 * Returns null when Apple does not recognise the transaction — an invalid id,
 * a transaction belonging to another app, or a fabricated one. Callers must
 * treat null as "grant nothing".
 *
 * PRODUCTION IS TRIED FIRST, THEN SANDBOX. Apple runs two separate
 * environments with no cross-visibility: a sandbox transaction 404s against
 * production and vice versa. Apple's own guidance is to try production and
 * fall back, which also means TestFlight and App Review — both of which
 * transact in sandbox — work against the same deployed function without a
 * config flag. The environment is reported back so callers can log it.
 */
export async function getSubscriptionStatus(
  transactionId: string,
): Promise<AppleSubscription | null> {
  const token = await createBearerToken();

  let response = await fetchStatus(PRODUCTION_BASE, transactionId, token);
  let environment: 'Production' | 'Sandbox' = 'Production';

  if (response.status === 404) {
    response = await fetchStatus(SANDBOX_BASE, transactionId, token);
    environment = 'Sandbox';
  }

  if (!response.ok) return null;

  const body = (await response.json()) as StatusResponse;

  // Guard against a transaction from a different app being used to unlock this
  // one. Apple scopes the key to our apps, but the check is cheap and the
  // failure mode — free access — is not.
  if (body.bundleId && body.bundleId !== BUNDLE_ID) return null;

  const last = body.data?.[0]?.lastTransactions?.[0];
  if (!last?.signedTransactionInfo) return null;

  const info = decodeJwsPayload<TransactionPayload>(last.signedTransactionInfo);
  if (!info) return null;
  if (info.bundleId && info.bundleId !== BUNDLE_ID) return null;

  const originalTransactionId =
    info.originalTransactionId ?? last.originalTransactionId ?? transactionId;

  return {
    originalTransactionId,
    productId: info.productId ?? '',
    status: last.status ?? APPLE_STATUS.EXPIRED,
    expiresAt: msToIso(info.expiresDate),
    revokedAt: msToIso(info.revocationDate),
    environment,
  };
}

/**
 * Translate Apple's status into the expiry we store, or null for "no access".
 *
 * BILLING_RETRY and GRACE_PERIOD both keep access. Apple has not been paid yet
 * in either case, but it is still trying, and cutting a paying customer off
 * over a temporarily declined card — then restoring them days later — is worse
 * for the customer than the few days of access it saves. Apple's own guidance
 * is to honour the grace period.
 *
 * A revocation always wins, whatever the status says: a refunded purchase must
 * not keep access, or refunds become a free subscription.
 */
export function accessExpiryFor(sub: AppleSubscription): string | null {
  if (sub.revokedAt) return sub.revokedAt;

  switch (sub.status) {
    case APPLE_STATUS.ACTIVE:
    case APPLE_STATUS.BILLING_RETRY:
    case APPLE_STATUS.GRACE_PERIOD:
      return sub.expiresAt;
    case APPLE_STATUS.EXPIRED:
    case APPLE_STATUS.REVOKED:
      // Expire now rather than writing Apple's past expiry date. Both lock the
      // user out, but "now" is unambiguous in logs and does not depend on
      // Apple having supplied an expiresDate at all.
      return new Date().toISOString();
    default:
      // An unrecognised status is not a reason to grant access.
      return null;
  }
}
