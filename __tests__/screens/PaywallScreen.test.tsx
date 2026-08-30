/**
 * PaywallScreen — the screen Apple reviews and the only place the app sells.
 *
 * These tests cover the two things that decide whether the screen passes
 * review: that every Guideline 3.1.2 element is actually rendered, and that the
 * Subscribe button always produces a visible outcome. A purchase control that
 * silently does nothing is a documented rejection reason, and it is exactly the
 * state a user lands in when their product fetch failed.
 */
import React from 'react';
import {Alert} from 'react-native';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';

const mockIap = {
  initIap: jest.fn(),
  endIap: jest.fn(),
  fetchSubscription: jest.fn(),
  purchaseSubscription: jest.fn(),
  restorePurchases: jest.fn(),
  listenForPurchases: jest.fn(() => jest.fn()),
};

jest.mock('@/services/iap', () => ({
  IAP_AVAILABLE: true,
  FALLBACK_PRICE: '$19.99',
  IOS_SUBSCRIPTION_SKU: 'com.executivemeditator.access.3month',
  initIap: (...a: unknown[]) => mockIap.initIap(...a),
  endIap: (...a: unknown[]) => mockIap.endIap(...a),
  fetchSubscription: (...a: unknown[]) => mockIap.fetchSubscription(...a),
  purchaseSubscription: (...a: unknown[]) => mockIap.purchaseSubscription(...a),
  restorePurchases: (...a: unknown[]) => mockIap.restorePurchases(...a),
  listenForPurchases: (...a: unknown[]) => mockIap.listenForPurchases(...a),
}));

jest.mock('@/config/supabase', () => ({
  supabase: {auth: {signOut: jest.fn()}},
  TABLES: {PROFILES: 'profiles'},
}));

jest.mock('@/services/supabase/database', () => ({
  fetchPaymentStatus: jest.fn().mockResolvedValue({
    isPaid: true,
    paidAt: '2026-08-01T00:00:00Z',
    accessExpiresAt: '2030-01-01T00:00:00Z',
    loopEnabled: true,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('@/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (fn: (s: unknown) => unknown) =>
    fn({auth: {user: {uid: 'uid-1'}}}),
}));

import {PaywallScreen} from '@/screens/PaywallScreen';

const OFFER = {
  sku: 'com.executivemeditator.access.3month',
  localizedPrice: '$19.99',
  title: 'Executive Meditator Access',
  description: '3 months',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockIap.initIap.mockResolvedValue(true);
  mockIap.fetchSubscription.mockResolvedValue(OFFER);
  mockIap.listenForPurchases.mockReturnValue(jest.fn());
});

/** Render and let the async StoreKit effects settle. */
async function renderPaywall() {
  const utils = render(<PaywallScreen />);
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

describe('Guideline 3.1.2 required elements', () => {
  it('renders title, duration, price, and renewal terms', async () => {
    const {getByText, queryByText} = await renderPaywall();
    expect(getByText('Executive Meditator Access')).toBeTruthy();
    expect(getByText('3 months')).toBeTruthy();
    expect(getByText('$19.99')).toBeTruthy();
    expect(getByText('every 3 months')).toBeTruthy();
    // The auto-renewal disclosure must be in the binary, next to the control —
    // not only in the App Store listing.
    expect(
      queryByText(/renews\s+automatically/i),
    ).toBeTruthy();
  });

  it('renders Restore Purchases and the legal links', async () => {
    const {getByText} = await renderPaywall();
    // Restore is mandatory for auto-renewable subscriptions; an app without one
    // is rejected regardless of anything else on the screen.
    expect(getByText('Restore Purchases')).toBeTruthy();
    expect(getByText('Terms of Use')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it("shows Apple's localized price rather than the hardcoded fallback", async () => {
    // Apple sets a different price per storefront, so a hardcoded amount is
    // wrong everywhere outside the US — and misstating the price is itself
    // grounds for rejection.
    mockIap.fetchSubscription.mockResolvedValue({
      ...OFFER,
      localizedPrice: '£17.99',
    });
    const {getByText} = await renderPaywall();
    expect(getByText('£17.99')).toBeTruthy();
  });

  it('falls back to a price rather than rendering an empty one', async () => {
    mockIap.fetchSubscription.mockResolvedValue(null);
    const {getByText} = await renderPaywall();
    expect(getByText('$19.99')).toBeTruthy();
  });
});

describe('Subscribe always produces a visible outcome', () => {
  it('EXPLAINS ITSELF WHEN THE PRODUCT NEVER LOADED', async () => {
    // The defect this screen shipped with: tapping Subscribe did nothing at all
    // — no message, no spinner. Not simulator-only; any user who was offline
    // when the paywall first loaded lands here.
    mockIap.fetchSubscription.mockResolvedValue(null);
    const {getByText, findByText} = await renderPaywall();

    await act(async () => {
      fireEvent.press(getByText('Subscribe'));
    });

    expect(await findByText(/not available right now/i)).toBeTruthy();
    // And it must not have attempted a purchase it cannot complete.
    expect(mockIap.purchaseSubscription).not.toHaveBeenCalled();
  });

  it('retries the product fetch once before giving up', async () => {
    // The first attempt may simply have raced a cold network.
    mockIap.fetchSubscription
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(OFFER);
    const {getByText} = await renderPaywall();

    await act(async () => {
      fireEvent.press(getByText('Subscribe'));
    });

    await waitFor(() => expect(mockIap.purchaseSubscription).toHaveBeenCalled());
  });

  it('surfaces a thrown error instead of failing silently', async () => {
    mockIap.purchaseSubscription.mockRejectedValue(new Error('Store is down'));
    const {getByText, findByText} = await renderPaywall();

    await act(async () => {
      fireEvent.press(getByText('Subscribe'));
    });

    expect(await findByText('Store is down')).toBeTruthy();
  });

  it('CLEARS THE SPINNER IF STOREKIT NEVER ANSWERS', async () => {
    // busy is deliberately left set after a successful call because the outcome
    // arrives on the listener, so a request that neither resolves nor errors
    // would spin forever with no way back.
    jest.useFakeTimers();
    // Never settles.
    mockIap.purchaseSubscription.mockReturnValue(new Promise(() => {}));
    const {getByText, queryByText} = render(<PaywallScreen />);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByText('Subscribe'));
    });
    expect(queryByText(/did not respond/i)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(91_000);
    });

    expect(queryByText(/did not respond/i)).toBeTruthy();
  });
});

describe('Restore', () => {
  it('tells the user plainly when there is nothing to restore', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockIap.restorePurchases.mockResolvedValue(null);
    const {getByText} = await renderPaywall();

    await act(async () => {
      fireEvent.press(getByText('Restore Purchases'));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Nothing to restore',
        expect.stringContaining('No active subscription'),
      ),
    );
    alertSpy.mockRestore();
  });

  it('reports a failure rather than looking like nothing happened', async () => {
    mockIap.restorePurchases.mockRejectedValue(new Error('offline'));
    const {getByText, findByText} = await renderPaywall();

    await act(async () => {
      fireEvent.press(getByText('Restore Purchases'));
    });

    expect(await findByText(/could not reach the App Store/i)).toBeTruthy();
  });
});

describe('accessibility', () => {
  it('labels every control, and speaks the price on the purchase button', async () => {
    // A screen-reader user must know what they are agreeing to pay before
    // activating the control, not after.
    const {getByLabelText} = await renderPaywall();
    expect(getByLabelText('Subscribe for $19.99 every 3 months')).toBeTruthy();
    expect(getByLabelText('Restore a previous purchase')).toBeTruthy();
    expect(getByLabelText('Read the Terms of Use')).toBeTruthy();
    expect(getByLabelText('Read the Privacy Policy')).toBeTruthy();
    expect(getByLabelText('Sign out of your account')).toBeTruthy();
  });
});
