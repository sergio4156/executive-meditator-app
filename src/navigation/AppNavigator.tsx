/**
 * AppNavigator — Supabase auth state drives routing.
 *
 * Unauthenticated → AuthStack
 * Authenticated   → MainTabs (Home, Dashboard, Notifications, Settings)
 */
import React, {useEffect} from 'react';
import {ActivityIndicator, AppState, View, StyleSheet, Text, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {useAppDispatch, useAppSelector} from '@/store';
import {setUser, setLoading, setIsPaid, setPaidAt, setLoopEnabled} from '@/store/slices/authSlice';
import {completeOnboarding} from '@/store/slices/notificationSlice';
import {onAuthStateChange} from '@/services/supabase/auth';
import {fetchPaymentStatus, syncTimeZoneIfChanged} from '@/services/supabase/database';
import {syncOneSignalIdForUser} from '@/services/onesignal/notifications';
import {setCurrentWeek} from '@/store/slices/meditationSlice';
import {deriveWeek} from '@/utils/weekProgression';
import {theme} from '@/theme';

import {HomeScreen} from '@/screens/HomeScreen';
import {DashboardScreen} from '@/screens/DashboardScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {NotificationsScreen} from '@/screens/NotificationsScreen';
import {AuthScreen} from '@/screens/AuthScreen';
import {OnboardingScreen} from '@/screens/OnboardingScreen';
import {PaywallScreen} from '@/screens/PaywallScreen';

export type AuthStackParamList = {Auth: undefined; Onboarding: undefined; Paywall: undefined};
export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '☯',
  Dashboard: '📊',
  Notifications: '🔔',
  Settings: '⚙️',
};

function MainTabs() {
  const unreadCount = useAppSelector(s => s.notifications.unreadCount);
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom},
        ],
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) =>
          route.name === 'Home' ? (
            <Image
              source={require('@/assets/tem-logo.jpg')}
              style={{width: size, height: size, borderRadius: 6}}
            />
          ) : (
            <Text style={{fontSize: 20, color}}>{TAB_ICONS[route.name]}</Text>
          ),
        tabBarBadge:
          route.name === 'Notifications' && unreadCount > 0
            ? unreadCount
            : undefined,
      })}>
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Dashboard" component={DashboardScreen} />
      <MainTab.Screen name="Notifications" component={NotificationsScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
}

export function AppNavigator() {
  const dispatch = useAppDispatch();
  const {user, loading, isPaid} = useAppSelector(s => s.auth);
  const onboardingComplete = useAppSelector(s => s.notifications.onboardingComplete);

  // Rehydrate onboarding state from AsyncStorage on boot
  useEffect(() => {
    AsyncStorage.getItem('onboarding').then(raw => {
      if (raw) {
        const {awakeStart, awakeEnd} = JSON.parse(raw);
        dispatch(completeOnboarding({awakeStart, awakeEnd}));
      }
    });
  }, [dispatch]);

  useEffect(() => {
    // Backstop: if Supabase auth doesn't emit INITIAL_SESSION within 5s
    // (cold-start network/storage hangs are real), unblock the UI anyway.
    const backstopTimeout = setTimeout(() => {
      dispatch(setLoading(false));
    }, 5000);

    const {data: {subscription}} = onAuthStateChange(async (_event, session) => {
      clearTimeout(backstopTimeout);
      if (session?.user) {
        const uid = session.user.id;
        dispatch(
          setUser({
            uid,
            email: session.user.email ?? null,
            displayName: session.user.user_metadata?.full_name ?? null,
            isAnonymous: session.user.is_anonymous ?? false,
          }),
        );
        syncOneSignalIdForUser(uid);

        // Hydrate isPaid + paidAt from cache so the navigator can render
        // immediately, then refresh from the backend in the background.
        const [cachedPaid, rawCachedPaidAt] = await Promise.all([
          AsyncStorage.getItem(`isPaid:${uid}`),
          AsyncStorage.getItem(`paidAt:${uid}`),
        ]);
        const cachedPaidAt = rawCachedPaidAt && rawCachedPaidAt.length > 0 ? rawCachedPaidAt : null;
        dispatch(setIsPaid(cachedPaid === '1'));
        dispatch(setPaidAt(cachedPaidAt));
        dispatch(setCurrentWeek(deriveWeek(cachedPaidAt)));
        dispatch(setLoading(false));

        fetchPaymentStatus(uid)
          .then(({isPaid, paidAt, loopEnabled}) => {
            dispatch(setIsPaid(isPaid));
            dispatch(setPaidAt(paidAt));
            dispatch(setLoopEnabled(loopEnabled));
            dispatch(setCurrentWeek(deriveWeek(paidAt)));
            AsyncStorage.setItem(`isPaid:${uid}`, isPaid ? '1' : '0').catch(() => {});
            AsyncStorage.setItem(`paidAt:${uid}`, paidAt ?? '').catch(() => {});
          })
          .catch(() => {
            // Keep cached values on failure
          });

        // Re-align reminder timing to the current device tz on every sign-in.
        syncTimeZoneIfChanged(uid).catch(() => {
          // Best-effort; the existing utc_offset_minutes still works as a fallback.
        });
      } else {
        // Clear all cached payment-status entries on sign-out so a stale
        // value never bleeds into the next session.
        try {
          const keys = await AsyncStorage.getAllKeys();
          const toRemove = keys.filter(
            k => k.startsWith('isPaid:') || k.startsWith('paidAt:'),
          );
          if (toRemove.length > 0) {
            await AsyncStorage.multiRemove(toRemove);
          }
        } catch {
          // Storage cleanup is best-effort; don't block sign-out
        }

        dispatch(setUser(null));
        dispatch(setIsPaid(false));
        dispatch(setPaidAt(null));
        dispatch(setLoading(false));
      }
    });

    return () => {
      clearTimeout(backstopTimeout);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Re-sync the user's tz whenever the app comes back to the foreground —
  // catches travelers who fly across time zones without restarting the app.
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        syncTimeZoneIfChanged(uid).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        !isPaid ? (
          <AuthStack.Navigator screenOptions={{headerShown: false}}>
            <AuthStack.Screen name="Paywall" component={PaywallScreen} />
          </AuthStack.Navigator>
        ) : onboardingComplete ? (
          <MainTabs />
        ) : (
          <AuthStack.Navigator screenOptions={{headerShown: false}}>
            <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
          </AuthStack.Navigator>
        )
      ) : (
        <AuthStack.Navigator screenOptions={{headerShown: false}}>
          <AuthStack.Screen name="Auth" component={AuthScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
