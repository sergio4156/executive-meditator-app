/**
 * Tests for the iOS purchase client.
 *
 * The two behaviours worth pinning are both failure paths, because both cost
 * money when they regress: an unverified purchase must NOT be finished (or the
 * user pays and the transaction is thrown away), and a restore must survey
 * every transaction rather than trusting the array's order.
 */
import {Platform} from 'react-native';

const mockGetSubscriptions = jest.fn();
const mockRequestSubscription = jest.fn();
const mockGetAvailablePurchases = jest.fn();
const mockFinishTransaction = jest.fn();
const mockInitConnection = jest.fn();
const mockEndConnection = jest.fn();
let purchaseHandler: ((purchase: unknown) => void) | null = null;
let errorHandler: ((err: unknown) => void) | null = null;

jest.mock('react-native-iap', () => ({
  initConnection: (...a: unknown[]) => mockInitConnection(...a),
  endConnection: (...a: unknown[]) => mockEndConnection(...a),
  getSubscriptions: (...a: unknown[]) => mockGetSubscriptions(...a),
  requestSubscription: (...a: unknown[]) => mockRequestSubscription(...a),
  getAvailablePurchases: (...a: unknown[]) => mockGetAvailablePurchases(...a),
  finishTransaction: (...a: unknown[]) => mockFinishTransaction(...a),
  purchaseUpdatedListener: (cb: (p: unknown) => void) => {
    purchaseHandler = cb;
    return {remove: jest.fn()};
  },
  purchaseErrorListener: (cb: (e: unknown) => void) => {
    errorHandler = cb;
    return {remove: jest.fn()};
  },
}));

const mockInvoke = jest.fn();
jest.mock('@/config/supabase', () => ({
  supabase: {functions: {invoke: (...a: unknown[]) => mockInvoke(...a)}},
  TABLES: {PROFILES: 'profiles'},
}));

import {
  IOS_SUBSCRIPTION_SKU,
  fetchSubscription,
  listenForPurchases,
  restorePurchases,
} from '@/services/iap';

/** Let queued promise callbacks run — the purchase listener is async. */
const flush = () => new Promise(resolve => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  purchaseHandler = null;
  errorHandler = null;
});

describe('platform', () => {
  it('runs on iOS, which is what these tests exercise', () => {
    // The whole module no-ops elsewhere; if the default test platform ever
    // changes, every expectation below would silently pass against a stub.
    expect(Platform.OS).toBe('ios');
  });
});

describe('fetchSubscription', () => {
  it('returns Apple\'s localized price rather than a hardcoded amount', async () => {
    mockGetSubscriptions.mockResolvedValue([
      {
        productId: IOS_SUBSCRIPTION_SKU,
        localizedPrice: '£17.99',
        title: 'Access',
        description: '3 months',
      },
    ]);
    const offer = await fetchSubscription();
    expect(offer?.localizedPrice).toBe('£17.99');
  });

  it('returns null when the product id does not match App Store Connect', async () => {
    // A typo in the SKU does not error — StoreKit just returns other products,
    // or nothing. Returning null lets the paywall fall back rather than
    // rendering an empty price.
    mockGetSubscriptions.mockResolvedValue([
      {productId: 'com.someone.else', localizedPrice: '$1.00'},
    ]);
    expect(await fetchSubscription()).toBeNull();
  });

  it('returns null instead of throwing when StoreKit is unreachable', async () => {
    mockGetSubscriptions.mockRejectedValue(new Error('offline'));
    expect(await fetchSubscription()).toBeNull();
  });
});

describe('listenForPurchases', () => {
  const purchase = {
    productId: IOS_SUBSCRIPTION_SKU,
    transactionId: '3000000000000001',
    originalTransactionIdentifierIOS: '2000000123456789',
  };

  function handlers() {
    return {
      onGranted: jest.fn(),
      onVerificationFailed: jest.fn(),
      onError: jest.fn(),
    };
  }

  it('verifies with the SUBSCRIPTION id, not the per-payment id', async () => {
    // originalTransactionIdentifierIOS is stable across renewals and so
    // identifies the subscription; transactionId changes every renewal and
    // would create a new binding each time.
    mockInvoke.mockResolvedValue({data: {accessExpiresAt: '2030-01-01T00:00:00Z'}, error: null});
    const h = handlers();
    listenForPurchases(h);
    purchaseHandler!(purchase);
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('verify-apple-purchase', {
      body: {transactionId: '2000000123456789'},
    });
  });

  it('falls back to transactionId when there is no original', async () => {
    mockInvoke.mockResolvedValue({data: {accessExpiresAt: '2030-01-01T00:00:00Z'}, error: null});
    listenForPurchases(handlers());
    purchaseHandler!({...purchase, originalTransactionIdentifierIOS: undefined});
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('verify-apple-purchase', {
      body: {transactionId: '3000000000000001'},
    });
  });

  it('grants access with the server-confirmed expiry and finishes the transaction', async () => {
    mockInvoke.mockResolvedValue({data: {accessExpiresAt: '2030-01-01T00:00:00Z'}, error: null});
    const h = handlers();
    listenForPurchases(h);
    purchaseHandler!(purchase);
    await flush();

    expect(h.onGranted).toHaveBeenCalledWith('2030-01-01T00:00:00Z');
    expect(mockFinishTransaction).toHaveBeenCalled();
  });

  it('DOES NOT FINISH THE TRANSACTION WHEN VERIFICATION FAILS', async () => {
    // The critical one. Finishing tells StoreKit never to redeliver, so a user
    // who paid while our backend was down would lose the purchase with no
    // recovery path but a manual refund. Leaving it unfinished means it comes
    // back on the next launch and verifies then.
    mockInvoke.mockResolvedValue({data: null, error: new Error('502')});
    const h = handlers();
    listenForPurchases(h);
    purchaseHandler!(purchase);
    await flush();

    expect(mockFinishTransaction).not.toHaveBeenCalled();
    expect(h.onGranted).not.toHaveBeenCalled();
    expect(h.onVerificationFailed).toHaveBeenCalled();
  });

  it('does not grant access when the server returns no expiry', async () => {
    // A 200 with an empty body must not be read as success.
    mockInvoke.mockResolvedValue({data: {}, error: null});
    const h = handlers();
    listenForPurchases(h);
    purchaseHandler!(purchase);
    await flush();

    expect(h.onGranted).not.toHaveBeenCalled();
    expect(mockFinishTransaction).not.toHaveBeenCalled();
  });

  it('reports a user cancellation as cancelled, not as an error to apologise for', () => {
    const h = handlers();
    listenForPurchases(h);
    errorHandler!({code: 'E_USER_CANCELLED', message: 'Cancelled'});
    expect(h.onError).toHaveBeenCalledWith('Cancelled', true);
  });

  it('reports a real failure as an error', () => {
    const h = handlers();
    listenForPurchases(h);
    errorHandler!({code: 'E_NETWORK_ERROR', message: 'Network down'});
    expect(h.onError).toHaveBeenCalledWith('Network down', false);
  });
});

describe('restorePurchases', () => {
  it('returns null when the Apple ID owns nothing for this app', async () => {
    mockGetAvailablePurchases.mockResolvedValue([]);
    expect(await restorePurchases()).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('ignores transactions belonging to other products', async () => {
    mockGetAvailablePurchases.mockResolvedValue([
      {productId: 'com.other.thing', transactionId: '1'},
    ]);
    expect(await restorePurchases()).toBeNull();
  });

  it('CHECKS EVERY TRANSACTION AND KEEPS THE LATEST EXPIRY', async () => {
    // A long-standing subscriber accumulates transactions, and the array is
    // not guaranteed to be newest-first. Stopping at the first one could
    // report "nothing to restore" to someone who is currently subscribed.
    mockGetAvailablePurchases.mockResolvedValue([
      {productId: IOS_SUBSCRIPTION_SKU, originalTransactionIdentifierIOS: '1'},
      {productId: IOS_SUBSCRIPTION_SKU, originalTransactionIdentifierIOS: '2'},
    ]);
    mockInvoke
      .mockResolvedValueOnce({data: {accessExpiresAt: '2020-01-01T00:00:00Z'}, error: null})
      .mockResolvedValueOnce({data: {accessExpiresAt: '2030-01-01T00:00:00Z'}, error: null});

    expect(await restorePurchases()).toBe('2030-01-01T00:00:00Z');
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('returns null when the server rejects every transaction', async () => {
    mockGetAvailablePurchases.mockResolvedValue([
      {productId: IOS_SUBSCRIPTION_SKU, originalTransactionIdentifierIOS: '1'},
    ]);
    mockInvoke.mockResolvedValue({data: null, error: new Error('403')});
    expect(await restorePurchases()).toBeNull();
  });
});
