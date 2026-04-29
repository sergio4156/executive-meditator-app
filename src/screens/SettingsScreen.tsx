/**
 * SettingsScreen — Schedule configuration and account management.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useAppDispatch, useAppSelector} from '@/store';
import {completeOnboarding, resetOnboarding} from '@/store/slices/notificationSlice';
import {setLoopEnabled} from '@/store/slices/authSlice';
import {signOut} from '@/services/supabase/auth';
import {syncUserSchedule, updateLoopEnabled} from '@/services/supabase/database';
import {supabase} from '@/config/supabase';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import {WEEK_CONFIG} from '@/utils/meditation';
import {daysUntilNextWeek, isFirstCycleComplete} from '@/utils/weekProgression';

function fmtHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const {user, paidAt, loopEnabled} = useAppSelector(s => s.auth);
  const {currentWeek} = useAppSelector(s => s.meditation);
  const daysToNext = daysUntilNextWeek(paidAt);
  const cycleComplete = isFirstCycleComplete(paidAt);
  const {fcmPermissionGranted, awakeStart, awakeEnd} = useAppSelector(
    s => s.notifications,
  );

  const [localAwakeStart, setLocalAwakeStart] = useState(awakeStart);
  const [localAwakeEnd, setLocalAwakeEnd] = useState(awakeEnd);

  const handleToggleLoop = async (next: boolean) => {
    dispatch(setLoopEnabled(next));
    if (!user?.uid) return;
    try {
      await updateLoopEnabled(user.uid, next);
    } catch (err) {
      // Roll back optimistic update on failure
      dispatch(setLoopEnabled(!next));
      Alert.alert(
        'Could not save',
        'Your reminder preference could not be updated. Please check your connection and try again.',
      );
    }
  };

  const syncSchedule = async (
    week: 1 | 2 | 3,
    start: number,
    end: number,
  ) => {
    const {data: sessionData} = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (uid) {
      syncUserSchedule(uid, week, start, end).catch(console.warn);
    }
  };

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

        {/* Program week — auto-progresses based on time since payment */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Program Week</Text>
          <Text style={styles.weekHeadline}>
            Week {currentWeek} of 3
          </Text>
          <Text style={styles.sectionSubtitle}>
            {WEEK_CONFIG[currentWeek].description}
          </Text>
          <Text style={styles.weekProgressNote}>
            {currentWeek === 3
              ? `Cycle restarts in ${daysToNext} day${daysToNext === 1 ? '' : 's'}. Reminders return to weekly cadence.`
              : `Week ${currentWeek + 1} begins in ${daysToNext} day${daysToNext === 1 ? '' : 's'}. Your program advances automatically.`}
          </Text>

          {cycleComplete && (
            <View style={styles.loopToggleRow}>
              <View style={styles.loopToggleText}>
                <Text style={styles.notifLabel}>Continue indefinite loop</Text>
                <Text style={styles.notifHint}>
                  {loopEnabled
                    ? 'Reminders will keep cycling 60 → 30 → 15 min every 21 days.'
                    : 'Reminders are paused. Toggle on to resume the cycle.'}
                </Text>
              </View>
              <Switch
                value={loopEnabled}
                onValueChange={handleToggleLoop}
                trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              />
            </View>
          )}
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
                    syncSchedule(currentWeek, v, localAwakeEnd);
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
                    syncSchedule(currentWeek, v, localAwakeEnd);
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
                    syncSchedule(currentWeek, localAwakeStart, v);
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
                    syncSchedule(currentWeek, localAwakeStart, v);
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
  weekHeadline: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  weekProgressNote: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  loopToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  loopToggleText: {flex: 1, gap: 2},
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
