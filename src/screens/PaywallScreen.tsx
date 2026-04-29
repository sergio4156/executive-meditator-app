/**
 * PaywallScreen — shown when a user is authenticated but has not paid.
 * Directs them to the website to complete their purchase.
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

const WEBSITE_URL = 'https://executivemeditator.com/#pricing';
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
            The Executive Meditator program requires a one-time investment.
            Visit the website to complete your purchase — then sign back in with
            the same email to unlock full access.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL(WEBSITE_URL)}
            activeOpacity={0.85}>
            <Text style={styles.buttonText}>Get Access</Text>
          </TouchableOpacity>
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
    fontFamily: theme.typography.fontFamily.serif,
    fontSize: 26,
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.sans,
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
    fontFamily: theme.typography.fontFamily.serif,
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: '300',
    marginBottom: 12,
  },
  cardBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 2,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.background,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  signOutButton: {
    marginTop: 16,
  },
  signOutText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    opacity: 0.6,
  },
  supportLink: {
    marginTop: 24,
  },
  supportText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
