/**
 * PaywallScreen — shown when a user is authenticated but has no active access.
 *
 * TWO DIFFERENT SCREENS, BY PLATFORM.
 *
 * iOS sells. Apple's Guideline 3.1.1 requires that content unlocked inside the
 * app be purchasable with In-App Purchase, and this screen carries every
 * element Guideline 3.1.2 requires of an auto-renewable subscription:
 * title, duration, price, what renewal costs, a plain statement that it
 * auto-renews until cancelled, where to cancel, Restore Purchases, and
 * functional links to the Terms (EULA) and Privacy Policy. Each of those is a
 * documented rejection reason on its own.
 *
 * Android does not sell. Google Play's Payments policy forbids pointing users
 * at an external purchase, and Play Billing is not implemented yet, so the
 * Android build keeps the neutral "your account lacks access" message it has
 * always had. No price, no link out.
 *
 * The purchase itself is handled by src/services/iap — this screen only drives
 * it and reflects the result. Entitlement is decided by the server.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {supabase} from '@/config/supabase';
import {useAppDispatch, useAppSelector} from '@/store';
import {setIsPaid, setPaidAt} from '@/store/slices/authSlice';
import {setCurrentWeek} from '@/store/slices/meditationSlice';
import {deriveWeek} from '@/utils/weekProgression';
import {fetchPaymentStatus} from '@/services/supabase/database';
import {
  FALLBACK_PRICE,
  IAP_AVAILABLE,
  endIap,
  fetchSubscription,
  initIap,
  listenForPurchases,
  purchaseSubscription,
  restorePurchases,
  type SubscriptionOffer,
} from '@/services/iap';
import {theme} from '@/theme';

const SUPPORT_EMAIL = 'admin@theexecutivemeditator.com';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Help%20with%20my%20account`;
const TERMS_URL = 'https://www.theexecutivemeditator.com/terms';
const PRIVACY_URL = 'https://www.theexecutivemeditator.com/privacy';
/** Apple's deep link to the user's own subscription management screen. */
const MANAGE_SUBSCRIPTIONS_URL =
  'https://apps.apple.com/account/subscriptions';
/**
 * How long to leave the Subscribe spinner up before assuming StoreKit will
 * never answer. Long enough to cover the App Store sheet plus Face ID and a
 * password prompt; short enough that a wedged request does not look permanent.
 */
const PURCHASE_TIMEOUT_MS = 90_000;

export function PaywallScreen() {
  const dispatch = useAppDispatch();
  const uid = useAppSelector(s => s.auth.user?.uid);

  const [offer, setOffer] = useState<SubscriptionOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Backstop for a StoreKit request that never reports an outcome. Generous
  // on purpose: the App Store sheet, Face ID, and a password prompt can take a
  // while, and firing early would tell a user their purchase failed while it
  // is still in progress.
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearBusyWatchdog = useCallback(() => {
    if (busyTimeoutRef.current) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
  }, []);
  useEffect(() => clearBusyWatchdog, [clearBusyWatchdog]);

  /**
   * Adopt a confirmed expiry.
   *
   * The expiry passed in already came from the server, so access can be
   * granted immediately without waiting on a round trip. The follow-up fetch is
   * only to pick up `paid_at`, which anchors the program week and which this
   * screen does not otherwise know.
   */
  const grantAccess = useCallback(
    async (accessExpiresAt: string) => {
      if (!uid) {return;}
      await AsyncStorage.setItem(
        `accessExpiresAt:${uid}`,
        accessExpiresAt,
      ).catch(() => {});
      dispatch(setIsPaid(true));

      try {
        const status = await fetchPaymentStatus(uid);
        dispatch(setPaidAt(status.paidAt));
        dispatch(setCurrentWeek(deriveWeek(status.paidAt)));
        await AsyncStorage.setItem(`paidAt:${uid}`, status.paidAt ?? '').catch(
          () => {},
        );
      } catch {
        // Access is already granted; the week resolves on the next launch.
      }
    },
    [dispatch, uid],
  );

  // Open StoreKit and load the real price. Runs only on iOS.
  useEffect(() => {
    if (!IAP_AVAILABLE) {return;}
    let cancelled = false;

    void (async () => {
      const connected = await initIap();
      if (!connected || cancelled) {return;}
      const product = await fetchSubscription();
      if (!cancelled) {setOffer(product);}
    })();

    return () => {
      cancelled = true;
      void endIap();
    };
  }, []);

  // StoreKit delivers purchases asynchronously — including ones completed
  // minutes after the tap (Ask to Buy) or on a previous launch — so the
  // listener, not the purchase call, is what grants access.
  useEffect(() => {
    if (!IAP_AVAILABLE) {return;}
    // Every branch cancels the watchdog first: a real outcome has arrived, so
    // the timeout must not fire later and overwrite it with "the App Store did
    // not respond" after the purchase has already succeeded.
    return listenForPurchases({
      onGranted: expiry => {
        clearBusyWatchdog();
        setBusy(false);
        setMessage(null);
        void grantAccess(expiry);
      },
      onVerificationFailed: () => {
        clearBusyWatchdog();
        setBusy(false);
        setMessage(
          'Your purchase went through, but we could not confirm it yet. It will be applied automatically — reopen the app in a few minutes, or contact support.',
        );
      },
      onError: (text, cancelledByUser) => {
        clearBusyWatchdog();
        setBusy(false);
        setMessage(cancelledByUser ? null : text);
      },
    });
  }, [clearBusyWatchdog, grantAccess]);

  const onSubscribe = useCallback(async () => {
    setMessage(null);

    // If StoreKit never returned the product, there is nothing to buy and
    // requestSubscription does nothing visible — a Subscribe button that
    // silently fails is a documented rejection reason, and the same state
    // occurs for any user who was offline when the paywall first loaded.
    // Retry the fetch once before giving up, since the earlier attempt may
    // simply have raced a cold network.
    let product = offer;
    if (!product) {
      setBusy(true);
      await initIap();
      product = await fetchSubscription();
      if (product) {
        setOffer(product);
      }
    }

    if (!product) {
      setBusy(false);
      setMessage(
        'The subscription is not available right now. Check your connection and try again, or contact support below.',
      );
      return;
    }

    setBusy(true);
    // Watchdog. `busy` is deliberately left set after a successful call
    // because the outcome arrives on the listener, which means a StoreKit
    // request that neither resolves nor reports an error would spin forever.
    // This only clears the spinner — it cancels nothing, so a purchase that
    // completes later still grants access through onGranted.
    clearBusyWatchdog();
    busyTimeoutRef.current = setTimeout(() => {
      setBusy(false);
      setMessage(
        'The App Store did not respond. If you were not charged, try again; if you were, your access will be applied automatically.',
      );
    }, PURCHASE_TIMEOUT_MS);

    try {
      await purchaseSubscription();
      // Intentionally leaves `busy` set: the outcome arrives on the listener.
    } catch (err) {
      clearBusyWatchdog();
      setBusy(false);
      setMessage(
        err instanceof Error
          ? err.message
          : 'The purchase could not be started.',
      );
    }
  }, [clearBusyWatchdog, offer]);

  const onRestore = useCallback(async () => {
    setMessage(null);
    // A watchdog left over from an abandoned Subscribe tap would otherwise
    // fire mid-restore and report an App Store failure that did not happen.
    clearBusyWatchdog();
    setBusy(true);
    try {
      const expiry = await restorePurchases();
      if (expiry) {
        await grantAccess(expiry);
        // Normally this screen unmounts the moment access is granted. Clearing
        // busy anyway keeps the button usable if it does not — otherwise a
        // spinner would sit there permanently.
        setBusy(false);
      } else {
        setBusy(false);
        Alert.alert(
          'Nothing to restore',
          'No active subscription was found for this Apple ID. If you subscribed on our website, sign in with that email address instead.',
        );
      }
    } catch {
      setBusy(false);
      setMessage('We could not reach the App Store. Please try again.');
    }
  }, [clearBusyWatchdog, grantAccess]);

  const price = offer?.localizedPrice ?? FALLBACK_PRICE;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <Image
          source={require('@/assets/tem-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />

        <Text style={styles.title}>Executive Meditator</Text>
        <Text style={styles.subtitle}>Profits · Productivity · Peace</Text>

        {IAP_AVAILABLE ? (
          <>
            <View style={styles.card}>
              {/* Guideline 3.1.2: title and duration, stated plainly. */}
              <Text style={styles.cardTitle}>Executive Meditator Access</Text>
              <Text style={styles.term}>3 months</Text>

              {/* The price comes from Apple, not from us. Apple sets a local
                  price per storefront, so a hardcoded dollar amount would be
                  wrong everywhere outside the US — and misstating the price is
                  itself grounds for rejection. */}
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.priceNote}>every 3 months</Text>

              <Text style={styles.cardBody}>
                The full 21-day program and continued access to the Great
                Silence — 10 seconds of inner stillness, anytime.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.buttonDisabled]}
                onPress={onSubscribe}
                disabled={busy}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Subscribe for ${price} every 3 months`}>
                {busy ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>Subscribe</Text>
                )}
              </TouchableOpacity>

              {/* Required disclosure. Apple expects the renewal terms to be
                  visible in the binary, next to the purchase control — not
                  only in the App Store listing. */}
              <Text style={styles.disclosure}>
                Payment is charged to your Apple Account at confirmation of
                purchase. The subscription renews automatically for {price}{' '}
                every 3 months unless it is cancelled at least 24 hours before
                the end of the current period. Manage or cancel it any time in
                your Apple Account settings.
              </Text>
            </View>

            {message ? (
              <Text style={styles.message} accessibilityLiveRegion="polite">
                {message}
              </Text>
            ) : null}

            {/* Restore is mandatory for auto-renewable subscriptions, and is
                the real recovery path after a reinstall or on a second
                device — entitlement lives with the Apple ID, not this install. */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={onRestore}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Restore a previous purchase">
              <Text style={styles.linkText}>Restore Purchases</Text>
            </TouchableOpacity>

            <View style={styles.legalRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL(TERMS_URL)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Read the Terms of Use">
                <Text style={styles.legalText}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(PRIVACY_URL)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Read the Privacy Policy">
                <Text style={styles.legalText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Manage your subscription in Apple Account settings">
                <Text style={styles.legalText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Access Required</Text>
            <Text style={styles.cardBody}>
              This account doesn't have access to the 21-day program yet. If
              you've already purchased, make sure you're signed in with the same
              email. Need help? Contact support below.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.supportLink}
          onPress={() => Linking.openURL(SUPPORT_MAILTO)}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="Already paid but stuck here? Contact support by email">
          <Text style={styles.supportText}>
            Already paid but stuck here? Contact support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => supabase.auth.signOut()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account">
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 26,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 28,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 20,
    color: theme.colors.textPrimary,
    fontWeight: '300',
    marginBottom: 6,
    textAlign: 'center',
  },
  term: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  price: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 38,
    fontWeight: '300',
    color: theme.colors.textPrimary,
  },
  priceNote: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  cardBody: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.background,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  disclosure: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    opacity: 0.75,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
  },
  message: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 16,
  },
  linkRow: {
    marginTop: 22,
  },
  linkText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 18,
  },
  legalText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    opacity: 0.5,
    marginHorizontal: 8,
  },
  signOutButton: {
    marginTop: 20,
  },
  signOutText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    opacity: 0.6,
  },
  supportLink: {
    marginTop: 24,
  },
  supportText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
