/**
 * ProgressBar — animated horizontal progress indicator.
 */
import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {theme} from '@/theme';

interface Props {
  /** 0 to 1 */
  progress: number;
  color?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  color = theme.colors.primary,
  height = 8,
}: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, {height}]}>
      <Animated.View style={[styles.fill, barStyle, {backgroundColor: color, height}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: theme.radius.full,
  },
});
