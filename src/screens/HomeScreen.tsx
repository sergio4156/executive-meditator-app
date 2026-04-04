/**
 * HomeScreen — Passive schedule status view.
 * No user interaction required after onboarding.
 */
import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppSelector} from '@/store';
import {AlarmCard} from '@/components/AlarmCard';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import {WEEK_CONFIG} from '@/utils/meditation';

function fmtHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function HomeScreen() {
  const {currentWeek, alarmLevel} = useAppSelector(s => s.meditation);
  const {awakeStart, awakeEnd, fcmPermissionGranted} = useAppSelector(
    s => s.notifications,
  );
  const weekConfig = WEEK_CONFIG[currentWeek];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/tem-logo.jpg')}
            style={styles.logo}
          />
          <Text style={styles.title}>The Executive Meditator</Text>
          <Text style={styles.subtitle}>Your schedule is active</Text>
        </View>

        {/* Alarm card — only visible when reminders are overdue */}
        {alarmLevel !== 'none' && <AlarmCard level={alarmLevel} />}

        {/* Schedule summary */}
        <Card style={styles.scheduleCard}>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>Week {currentWeek}</Text>
          </View>
          <Text style={styles.scheduleDetail}>
            Reminder every {weekConfig.intervalMinutes} minute
            {weekConfig.intervalMinutes > 1 ? 's' : ''}
          </Text>
          <Text style={styles.scheduleDetail}>
            Between {fmtHour(awakeStart)} and {fmtHour(awakeEnd)}
          </Text>
        </Card>

        {/* Notification status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusDot}>
              {fcmPermissionGranted ? '🟢' : '🔴'}
            </Text>
            <Text style={styles.statusText}>
              {fcmPermissionGranted
                ? 'Notifications enabled — sit back and relax'
                : 'Enable notifications in Settings to receive reminders'}
            </Text>
          </View>
        </Card>

        {/* Passive instruction */}
        <Text style={styles.passiveHint}>
          When a reminder arrives, pause for 10 seconds of open-eyed awareness.
          No action needed here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: theme.colors.background},
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {alignItems: 'center', gap: theme.spacing.sm},
  logo: {width: 100, height: 100, borderRadius: 20},
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  scheduleCard: {
    gap: theme.spacing.xs,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  weekBadge: {
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  weekBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  scheduleDetail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  statusCard: {paddingVertical: theme.spacing.md},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm},
  statusDot: {fontSize: 16},
  statusText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  passiveHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.sm * 1.6,
    fontStyle: 'italic',
    paddingHorizontal: theme.spacing.md,
  },
});
