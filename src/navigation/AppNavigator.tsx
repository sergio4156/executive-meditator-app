/**
 * AppNavigator — Supabase auth state drives routing.
 *
 * Unauthenticated → AuthStack
 * Authenticated   → MainTabs (Home, Dashboard, Notifications, Settings)
 */
import React, {useEffect} from 'react';
import {ActivityIndicator, View, StyleSheet, Text, Image} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {useAppDispatch, useAppSelector} from '@/store';
import {setUser, setLoading, setIsPaid} from '@/store/slices/authSlice';
import {completeOnboarding} from '@/store/slices/notificationSlice';
import {onAuthStateChange} from '@/services/supabase/auth';
import {fetchIsPaid} from '@/services/supabase/database';
import {syncOneSignalIdForUser} from '@/services/onesignal/notifications';
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

  return (
    <MainTab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
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

        // Hydrate isPaid from cache so the navigator can render immediately,
        // then refresh from the backend in the background.
        const cached = await AsyncStorage.getItem(`isPaid:${uid}`);
        dispatch(setIsPaid(cached === '1'));
        dispatch(setLoading(false));

        fetchIsPaid(uid)
          .then(paid => {
            dispatch(setIsPaid(paid));
            AsyncStorage.setItem(`isPaid:${uid}`, paid ? '1' : '0').catch(() => {});
          })
          .catch(() => {
            // Keep cached value on failure
          });
      } else {
        dispatch(setUser(null));
        dispatch(setIsPaid(false));
        dispatch(setLoading(false));
      }
    });

    return () => {
      clearTimeout(backstopTimeout);
      subscription.unsubscribe();
    };
  }, [dispatch]);

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
