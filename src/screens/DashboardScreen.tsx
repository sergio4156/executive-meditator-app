/**
 * DashboardScreen — Progress & accumulation tracking.
 *
 * Shows:
 *  - Weekly progress ring / bar
 *  - Daily completion rate
 *  - Streak counter
 *  - Badge showcase
 *  - Session history list
 */
import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppSelector} from '@/store';
import {useDatabase} from '@/hooks/useDatabase';
import {Card} from '@/components/Card';
import {ProgressBar} from '@/components/ProgressBar';
import {BadgeDisplay} from '@/components/BadgeDisplay';
import {theme} from '@/theme';
import {BADGES, WEEK_CONFIG} from '@/utils/meditation';
import type {MeditationSession} from '@/store/slices/meditationSlice';

// ---- helpers ----

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SessionRow({session}: {session: MeditationSession}) {
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionIcon}>{session.skipped ? '⏭️' : '✅'}</Text>
        <View>
          <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
          <Text style={styles.sessionDetail}>
            Week {session.week} · {session.durationSeconds}s
            {session.skipped ? ' · skipped' : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.sessionPoints}>
        +{session.pointsEarned} pts
      </Text>
    </View>
  );
}

export function DashboardScreen() {
  const {stats, history, historyLoading, currentWeek} = useAppSelector(
    s => s.meditation,
  );
  const {loadHistory} = useDatabase();

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekConfig = WEEK_CONFIG[currentWeek];
  // Expected sessions per day for current week
  const expectedPerDay = Math.floor((24 * 60) / weekConfig.intervalMinutes);
  const todayRate = Math.min(1, stats.completedToday / expectedPerDay);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your Progress</Text>

        {/* Oneness milestone */}
        {stats.onenessReached && (
          <Card style={styles.onenessBanner}>
            <Text style={styles.onenessTitle}>✨ Oneness Achieved ✨</Text>
            <Text style={styles.onenessSubtitle}>
              You have reached the irreversible experience of Oneness.
            </Text>
          </Card>
        )}

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.totalSessions}</Text>
            <Text style={styles.summaryLabel}>Total Sessions</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.gold}]}>
              {stats.streak}
            </Text>
            <Text style={styles.summaryLabel}>Day Streak 🔥</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.secondary}]}>
              {stats.totalPoints}
            </Text>
            <Text style={styles.summaryLabel}>Points</Text>
          </Card>
        </View>

        {/* Today's progress */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.progressSubtext}>
            {stats.completedToday} / {expectedPerDay} sessions completed
          </Text>
          <ProgressBar progress={todayRate} color={theme.colors.primary} />
        </Card>

        {/* Weekly completion rate */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <Text style={styles.progressSubtext}>
            {Math.round(stats.weeklyCompletionRate * 100)}% adherence
          </Text>
          <ProgressBar
            progress={stats.weeklyCompletionRate}
            color={
              stats.weeklyCompletionRate >= 0.8
                ? theme.colors.success
                : theme.colors.warning
            }
          />
          {!stats.onenessReached && (
            <Text style={styles.onenessHint}>
              Maintain ≥ 80% weekly adherence to unlock Oneness 🌟
            </Text>
          )}
        </Card>

        {/* Badges */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.badgeRow}>
              {BADGES.map(badge => (
                <BadgeDisplay
                  key={badge.id}
                  badge={badge}
                  earned={stats.badges.includes(badge.id)}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Session history */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {historyLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>
              No sessions yet — begin your first meditation!
            </Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={item => item.id}
              renderItem={({item}) => <SessionRow session={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
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
  onenessBanner: {
    backgroundColor: theme.colors.secondary + '22',
    borderColor: theme.colors.secondary,
    borderWidth: 1,
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  onenessTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.secondary,
  },
  onenessSubtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  summaryRow: {flexDirection: 'row', gap: theme.spacing.sm},
  summaryCard: {flex: 1, alignItems: 'center', padding: theme.spacing.md},
  summaryValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {gap: theme.spacing.sm},
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  progressSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  onenessHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  badgeRow: {flexDirection: 'row', gap: theme.spacing.md, paddingVertical: theme.spacing.sm},
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  sessionLeft: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm},
  sessionIcon: {fontSize: 20},
  sessionDate: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sessionDetail: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSize.xs,
  },
  sessionPoints: {
    color: theme.colors.gold,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  separator: {height: 1, backgroundColor: theme.colors.divider},
  emptyText: {color: theme.colors.textMuted, fontStyle: 'italic'},
});
