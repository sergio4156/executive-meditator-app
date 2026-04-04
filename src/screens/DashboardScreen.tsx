/**
 * DashboardScreen — Schedule overview.
 */
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppSelector} from '@/store';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import {WEEK_CONFIG} from '@/utils/meditation';

function fmtHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function nextReminderTime(
  intervalMinutes: number,
  awakeStart: number,
  awakeEnd: number,
): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  if (h < awakeStart || h >= awakeEnd) {
    return `${fmtHour(awakeStart)} tomorrow`;
  }

  const minutesElapsed = (h - awakeStart) * 60 + m;
  const minutesToNext =
    intervalMinutes - (minutesElapsed % intervalMinutes);
  const nextH = Math.floor((h * 60 + m + minutesToNext) / 60);
  const nextM = (h * 60 + m + minutesToNext) % 60;
  const period = nextH < 12 ? 'AM' : 'PM';
  const display = nextH % 12 === 0 ? 12 : nextH % 12;
  return `${display}:${String(nextM).padStart(2, '0')} ${period}`;
}

export function DashboardScreen() {
  const {currentWeek} = useAppSelector(s => s.meditation);
  const {awakeStart, awakeEnd, fcmPermissionGranted} = useAppSelector(
    s => s.notifications,
  );
  const weekConfig = WEEK_CONFIG[currentWeek];
  const nextReminder = nextReminderTime(
    weekConfig.intervalMinutes,
    awakeStart,
    awakeEnd,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Schedule</Text>

        {/* Status */}
        <Card style={styles.statusCard}>
          <Text style={styles.statusEmoji}>
            {fcmPermissionGranted ? '✅' : '⚠️'}
          </Text>
          <Text style={styles.statusTitle}>
            {fcmPermissionGranted ? "You're scheduled" : 'Notifications off'}
          </Text>
          <Text style={styles.statusSub}>
            {fcmPermissionGranted
              ? 'Reminders will arrive automatically'
              : 'Enable notifications in Settings'}
          </Text>
        </Card>

        {/* Next reminder */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Next Reminder</Text>
          <Text style={styles.bigValue}>{nextReminder}</Text>
        </Card>

        {/* Current schedule */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Current Program</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Week</Text>
            <Text style={styles.rowValue}>{currentWeek}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Frequency</Text>
            <Text style={styles.rowValue}>
              Every {weekConfig.intervalMinutes} min
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Awake window</Text>
            <Text style={styles.rowValue}>
              {fmtHour(awakeStart)} – {fmtHour(awakeEnd)}
            </Text>
          </View>
        </Card>

        {/* How it works */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.howText}>
            When a reminder arrives, pause wherever you are. Look slightly
            up-right with eyes open. Hold joyful anticipation for 10 seconds.
            That's it — no app interaction needed.
          </Text>
        </Card>
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
  statusCard: {alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xl},
  statusEmoji: {fontSize: 40},
  statusTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statusSub: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {gap: theme.spacing.sm},
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  bigValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  rowLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  rowValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  divider: {height: 1, backgroundColor: theme.colors.divider},
  howText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * 1.7,
  },
});
