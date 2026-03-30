/**
 * BadgeDisplay — shows a single badge, greyed out if not yet earned.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {theme} from '@/theme';

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

interface Props {
  badge: Badge;
  earned: boolean;
}

export function BadgeDisplay({badge, earned}: Props) {
  return (
    <View style={[styles.container, !earned && styles.containerLocked]}>
      <Text style={[styles.emoji, !earned && styles.emojiLocked]}>
        {earned ? badge.emoji : '🔒'}
      </Text>
      <Text style={[styles.label, !earned && styles.labelLocked]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.gold + '66',
  },
  containerLocked: {
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  emoji: {fontSize: 28},
  emojiLocked: {opacity: 0.4},
  label: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
  },
  labelLocked: {color: theme.colors.textMuted},
});
