/**
 * SettingsScreen — Schedule configuration and account management.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useAppDispatch, useAppSelector} from '@/store';
import {setCurrentWeek} from '@/store/slices/meditationSlice';
import {completeOnboarding, resetOnboarding} from '@/store/slices/notificationSlice';
import {signOut} from '@/services/supabase/auth';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import {WEEK_CONFIG} from '@/utils/meditation';

function fmtHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const {user} = useAppSelector(s => s.auth);
  const {currentWeek} = useAppSelector(s => s.meditation);
  const {fcmPermissionGranted, awakeStart, awakeEnd} = useAppSelector(
    s => s.notifications,
  );

  const [localAwakeStart, setLocalAwakeStart] = useState(awakeStart);
  const [localAwakeEnd, setLocalAwakeEnd] = useState(awakeEnd);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('onboarding');
          dispatch(resetOnboarding());
          signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountInfo}>
            <Text style={styles.accountEmail}>
              {user?.email ?? 'Guest user'}
            </Text>
            {user?.isAnonymous && (
              <Text style={styles.accountHint}>
                Sign up to keep your settings across devices.
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Card>

        {/* Program week */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Program Week</Text>
          <Text style={styles.sectionSubtitle}>
            {WEEK_CONFIG[currentWeek].description}
          </Text>
          <View style={styles.weekSelector}>
            {([1, 2, 3] as const).map(week => (
              <TouchableOpacity
                key={week}
                style={[
                  styles.weekButton,
                  currentWeek === week && styles.weekButtonActive,
                ]}
                onPress={() => dispatch(setCurrentWeek(week))}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.weekButtonText,
                    currentWeek === week && styles.weekButtonTextActive,
                  ]}>
                  Week {week}
                </Text>
                <Text
                  style={[
                    styles.weekButtonSub,
                    currentWeek === week && styles.weekButtonTextActive,
                  ]}>
                  Every {WEEK_CONFIG[week].intervalMinutes} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Awake window */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Awake Window</Text>
          <Text style={styles.sectionSubtitle}>
            Reminders will only be sent during these hours.
          </Text>
          <View style={styles.awakeRow}>
            <View style={styles.awakePicker}>
              <Text style={styles.awakeLabel}>Wake up</Text>
              <View style={styles.stepRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = Math.max(4, localAwakeStart - 1);
                    setLocalAwakeStart(v);
                    dispatch(completeOnboarding({awakeStart: v, awakeEnd: localAwakeEnd}));
                  }}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.awakeValue}>{fmtHour(localAwakeStart)}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = Math.min(localAwakeEnd - 1, localAwakeStart + 1);
                    setLocalAwakeStart(v);
                    dispatch(completeOnboarding({awakeStart: v, awakeEnd: localAwakeEnd}));
                  }}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.awakeDivider} />
            <View style={styles.awakePicker}>
              <Text style={styles.awakeLabel}>Sleep</Text>
              <View style={styles.stepRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = Math.max(localAwakeStart + 1, localAwakeEnd - 1);
                    setLocalAwakeEnd(v);
                    dispatch(completeOnboarding({awakeStart: localAwakeStart, awakeEnd: v}));
                  }}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.awakeValue}>{fmtHour(localAwakeEnd)}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const v = Math.min(23, localAwakeEnd + 1);
                    setLocalAwakeEnd(v);
                    dispatch(completeOnboarding({awakeStart: localAwakeStart, awakeEnd: v}));
                  }}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        {/* Notifications */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.notifRow}>
            <Text style={styles.notifLabel}>Push Notifications</Text>
            <Text
              style={{
                color: fcmPermissionGranted
                  ? theme.colors.success
                  : theme.colors.error,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
              {fcmPermissionGranted ? '✓ On' : '✗ Off'}
            </Text>
          </View>
          {!fcmPermissionGranted && (
            <Text style={styles.notifHint}>
              Enable in your device Settings → Notifications → Executive Meditator
            </Text>
          )}
          <Text style={styles.notifNote}>
            Reminders use vibration only — no sound.
          </Text>
        </Card>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>The Executive Meditator v1.0.0</Text>
          <Text style={styles.aboutText}>
            A passive micro-meditation program designed for peak performers.
          </Text>
        </Card>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              await AsyncStorage.removeItem('onboarding');
              dispatch(resetOnboarding());
            }}
            activeOpacity={0.8}>
            <Text style={styles.devButtonText}>⚙ DEV: Reset Onboarding</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: theme.colors.background},
  scroll: {padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40},
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  section: {gap: theme.spacing.sm},
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  accountInfo: {gap: theme.spacing.xs},
  accountEmail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  accountHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  weekSelector: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs},
  weekButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  weekButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '22',
  },
  weekButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  weekButtonTextActive: {color: theme.colors.primary},
  weekButtonSub: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  awakeRow: {flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm},
  awakePicker: {flex: 1, alignItems: 'center', gap: theme.spacing.xs},
  awakeLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  awakeValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    minWidth: 80,
    textAlign: 'center',
  },
  stepRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs},
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  awakeDivider: {
    width: 1,
    height: 48,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  notifHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  notifNote: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
  },
  aboutText: {fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary},
  signOutButton: {
    backgroundColor: theme.colors.error + '22',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  devButton: {
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    opacity: 0.6,
  },
  devButtonText: {color: theme.colors.textMuted, fontSize: theme.typography.fontSize.sm},
});
