/**
 * HomeScreen — Primary meditation interface.
 *
 * Shows:
 *  - Current program week & interval guidance
 *  - Countdown timer with animated ring
 *  - Start / Pause / Skip controls
 *  - Guidance text that shifts through the session
 *  - Alarm level indicator
 *  - Lottie "Monad hook-up" animation on completion
 */
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

import {useAppDispatch, useAppSelector} from '@/store';
import {
  startMeditation,
  pauseMeditation,
  resumeMeditation,
  skipMeditation,
  resetSessionUI,
} from '@/store/slices/meditationSlice';
import {useMeditation} from '@/hooks/useMeditation';
import {AlarmCard} from '@/components/AlarmCard';
import {MeditationTimer} from '@/components/MeditationTimer';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import {WEEK_CONFIG} from '@/utils/meditation';

export function HomeScreen() {
  const dispatch = useAppDispatch();
  const {sessionState, remainingSeconds, guidance, alarmLevel, currentWeek, stats} =
    useAppSelector(s => s.meditation);

  // Kick off the countdown logic (tick + auto-complete)
  useMeditation();

  // Fade-in animation for completion overlay
  const completionOpacity = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (sessionState === 'completed') {
      Animated.timing(completionOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      lottieRef.current?.play();

      // Auto-reset after showing completion screen for 3 s
      const timer = setTimeout(() => {
        Animated.timing(completionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => dispatch(resetSessionUI()));
      }, 3000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

  const weekConfig = WEEK_CONFIG[currentWeek];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>The Executive Meditator</Text>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>
              Week {currentWeek} · Every {weekConfig.intervalMinutes} min
            </Text>
          </View>
        </View>

        {/* Alarm indicator */}
        {alarmLevel !== 'none' && <AlarmCard level={alarmLevel} />}

        {/* Stats quick-view */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Streak 🔥</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </Card>
        </View>

        {/* Timer */}
        <MeditationTimer
          remaining={remainingSeconds}
          total={10}
          state={sessionState}
        />

        {/* Guidance text */}
        <Card style={styles.guidanceCard}>
          <Text style={styles.guidanceEmoji}>
            {sessionState === 'idle' ? '👁️' : sessionState === 'completed' ? '✨' : '🌊'}
          </Text>
          <Text style={styles.guidanceText}>{guidance}</Text>
        </Card>

        {/* Controls */}
        <View style={styles.controls}>
          {sessionState === 'idle' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => dispatch(startMeditation())}
              activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Begin Meditation</Text>
            </TouchableOpacity>
          )}

          {sessionState === 'active' && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => dispatch(pauseMeditation())}
                activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.skipButton]}
                onPress={() => dispatch(skipMeditation())}
                activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {sessionState === 'paused' && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => dispatch(resumeMeditation())}
                activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.skipButton]}
                onPress={() => dispatch(skipMeditation())}
                activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Oneness milestone banner */}
        {stats.onenessReached && (
          <Card style={styles.onenessBanner}>
            <Text style={styles.onenessText}>
              ✨ Irreversible experience of Oneness reached ✨
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Completion overlay with Lottie animation */}
      {sessionState === 'completed' && (
        <Animated.View style={[styles.completionOverlay, {opacity: completionOpacity}]}>
          {/* Lottie placeholder — replace src with your Monad animation file */}
          <LottieView
            ref={lottieRef}
            // Replace with a real .lottie / .json asset:
            // source={require('../assets/animations/monad_hookup.lottie')}
            source={{
              v: '5.5.7',
              fr: 30,
              ip: 0,
              op: 60,
              w: 400,
              h: 400,
              nm: 'placeholder',
              ddd: 0,
              assets: [],
              layers: [],
            }}
            style={styles.lottie}
            loop={false}
            autoPlay={false}
          />
          <Text style={styles.completionTitle}>Beautiful!</Text>
          <Text style={styles.completionSubtitle}>
            +{10} points earned · {guidance}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: theme.colors.background},
  scroll: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  header: {alignItems: 'center', marginBottom: theme.spacing.sm},
  appTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  weekBadge: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  weekBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  guidanceCard: {alignItems: 'center', width: '100%', padding: theme.spacing.lg},
  guidanceEmoji: {fontSize: 36, marginBottom: theme.spacing.sm},
  guidanceText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.md * 1.6,
  },
  controls: {width: '100%'},
  controlRow: {flexDirection: 'row', gap: theme.spacing.sm},
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  primaryButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skipButton: {opacity: 0.7},
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  onenessBanner: {
    width: '100%',
    backgroundColor: theme.colors.secondary + '22',
    borderColor: theme.colors.secondary,
    borderWidth: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  onenessText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background + 'EE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  lottie: {width: 200, height: 200},
  completionTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  completionSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
