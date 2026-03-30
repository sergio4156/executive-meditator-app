/**
 * AlarmCard — compassionate, non-punitive alarm display.
 *
 * Four alarm levels mapped to distinct colours and guidance messages.
 * Designed to feel supportive rather than jarring.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {theme} from '@/theme';
import type {AlarmLevel} from '@/store/slices/meditationSlice';

interface Props {
  level: AlarmLevel;
}

interface AlarmConfig {
  emoji: string;
  title: string;
  message: string;
  color: string;
}

const ALARM_CONFIG: Record<Exclude<AlarmLevel, 'none'>, AlarmConfig> = {
  subtle: {
    emoji: '🌿',
    title: 'Gentle Reminder',
    message:
      'A soft nudge — your body is inviting you to pause and reconnect. A brief meditation will restore your flow.',
    color: theme.colors.alarmSubtle,
  },
  mild: {
    emoji: '🌙',
    title: 'Low Energy Notice',
    message:
      'You may be feeling fatigue or mild discomfort. This is your system signalling a need for rest. A 10-second pause can help.',
    color: theme.colors.alarmMild,
  },
  disease: {
    emoji: '🌊',
    title: 'Rebalancing Needed',
    message:
      'An emotional or physical imbalance is present. Compassionately return to your practice — you are not behind, you are being called back.',
    color: theme.colors.alarmDisease,
  },
  critical: {
    emoji: '🔴',
    title: 'Immediate Attention',
    message:
      'Your body and mind are asking for urgent care. Please stop, breathe, and begin a meditation now. You are supported.',
    color: theme.colors.alarmCritical,
  },
};

export function AlarmCard({level}: Props) {
  if (level === 'none') return null;
  const config = ALARM_CONFIG[level];

  return (
    <View style={[styles.card, {borderColor: config.color, borderLeftColor: config.color}]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, {color: config.color}]}>{config.title}</Text>
        <Text style={styles.message}>{config.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    width: '100%',
    ...theme.shadow.sm,
  },
  emoji: {fontSize: 28, marginTop: 2},
  content: {flex: 1},
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
