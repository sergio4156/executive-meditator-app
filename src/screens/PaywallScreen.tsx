/**
 * PaywallScreen — shown when a user is authenticated but has not paid.
 * Per Google Play's Payments policy, this screen does NOT advertise a price
 * or link out to an external purchase. It only tells the user their account
 * lacks access and offers a support contact.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {supabase} from '@/config/supabase';
import {theme} from '@/theme';

const SUPPORT_EMAIL = 'hillisoralee@gmail.com';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Help%20with%20my%20account`;

export function PaywallScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image
          source={require('@/assets/tem-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Executive Meditator</Text>
        <Text style={styles.subtitle}>Profits · Productivity · Peace</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Access Required</Text>
          <Text style={styles.cardBody}>
            This account doesn't have access to the 21-day program yet. If
            you've already purchased, make sure you're signed in with the same
            email. Need help? Contact support below.
          </Text>
        </View>

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
          activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
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
    marginBottom: 40,
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
    marginBottom: 12,
  },
  cardBody: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  signOutButton: {
    marginTop: 16,
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
