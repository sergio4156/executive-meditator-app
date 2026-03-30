/**
 * Meditation utilities — week config, badge definitions, and alarm helpers.
 */
import type {Badge} from '@/components/BadgeDisplay';

// ---------- Program schedule ----------

export interface WeekConfig {
  week: 1 | 2 | 3;
  intervalMinutes: number;
  description: string;
}

export const WEEK_CONFIG: Record<1 | 2 | 3, WeekConfig> = {
  1: {
    week: 1,
    intervalMinutes: 60,
    description: '10-second meditation every hour',
  },
  2: {
    week: 2,
    intervalMinutes: 30,
    description: '10-second meditation every 30 minutes',
  },
  3: {
    week: 3,
    intervalMinutes: 15,
    description: '10-second meditation every 15 minutes',
  },
};

// ---------- Badges ----------

export const BADGES: Badge[] = [
  {
    id: 'first_meditation',
    emoji: '🌱',
    label: 'First Step',
    description: 'Complete your very first meditation.',
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    label: '3-Day Streak',
    description: 'Meditate for 3 consecutive days.',
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    label: '7-Day Streak',
    description: 'Meditate for 7 consecutive days.',
  },
  {
    id: 'streak_30',
    emoji: '💎',
    label: '30-Day Streak',
    description: 'Meditate for 30 consecutive days.',
  },
  {
    id: 'century',
    emoji: '💯',
    label: 'Centurion',
    description: 'Complete 100 total meditations.',
  },
  {
    id: 'oneness',
    emoji: '✨',
    label: 'Oneness',
    description: 'Reach the irreversible experience of Oneness.',
  },
];

// ---------- Oneness threshold ----------

/**
 * Returns true when the user has reached the Oneness milestone.
 * Criteria: ≥ 80% weekly adherence for 3 consecutive weeks.
 */
export function hasReachedOneness(
  weeklyRates: number[], // array of weekly completion rates, most recent last
): boolean {
  if (weeklyRates.length < 3) return false;
  const lastThree = weeklyRates.slice(-3);
  return lastThree.every(rate => rate >= 0.8);
}

// ---------- Points ----------

export const POINT_VALUES = {
  completedSession: 10,
  streak3Bonus: 5,
  streak7Bonus: 15,
  streak30Bonus: 50,
  centuryBonus: 25,
  onenessBonus: 100,
} as const;

// ---------- Session ID ----------

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
