/**
 * MeditationTimer
 *
 * Proper SVG arc countdown ring — shrinks from full circle to empty
 * as the session counts down, using react-native-svg + Reanimated.
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';
import {theme} from '@/theme';
import type {MeditationState} from '@/store/slices/meditationSlice';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  remaining: number;
  total: number;
  state: MeditationState;
}

const SIZE = 220;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MeditationTimer({remaining, total, state}: Props) {
  const progress = useSharedValue(1); // 1 = full ring, 0 = empty

  useEffect(() => {
    const target = state === 'idle' || state === 'completed' ? 1 : remaining / total;
    progress.value = withTiming(target, {
      duration: 900,
      easing: Easing.linear,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const ringColor =
    state === 'completed'
      ? theme.colors.success
      : state === 'paused'
      ? theme.colors.textMuted
      : theme.colors.primary;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={theme.colors.elevated}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Animated countdown arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // Start from top (12 o'clock)
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        {state === 'idle' ? (
          <>
            <Image source={require('@/assets/tem-logo.jpg')} style={styles.idleImage} />
            <Text style={styles.idleLabel}>Ready</Text>
          </>
        ) : state === 'completed' ? (
          <>
            <Text style={styles.idleEmoji}>✨</Text>
            <Text style={[styles.seconds, {color: theme.colors.success}]}>Done</Text>
          </>
        ) : (
          <>
            <Text style={styles.seconds}>{remaining}</Text>
            <Text style={styles.secondsLabel}>sec</Text>
            {state === 'paused' && (
              <Text style={styles.pausedLabel}>Paused</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  svg: {
    position: 'absolute',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  seconds: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  secondsLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: -4,
  },
  pausedLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  idleEmoji: {fontSize: 48},
  idleImage: {width: 72, height: 72, borderRadius: 14},
  idleLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
