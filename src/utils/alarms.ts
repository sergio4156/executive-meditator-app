/**
 * Alarm utilities — determine alarm level based on missed sessions.
 */
import type {AlarmLevel} from '@/store/slices/meditationSlice';

/**
 * Calculate the current alarm level based on how many scheduled sessions
 * the user has missed in a row.
 *
 * @param missedCount - number of consecutive missed sessions
 */
export function getAlarmLevel(missedCount: number): AlarmLevel {
  if (missedCount <= 0) return 'none';
  if (missedCount === 1) return 'subtle';
  if (missedCount <= 3) return 'mild';
  if (missedCount <= 6) return 'disease';
  return 'critical';
}

export interface AlarmNotificationPayload {
  title: string;
  body: string;
  level: AlarmLevel;
}

/**
 * Returns FCM-ready notification payload for each alarm level.
 * Messages are compassionate and non-punitive.
 */
export function getAlarmNotification(level: AlarmLevel): AlarmNotificationPayload | null {
  const payloads: Record<Exclude<AlarmLevel, 'none'>, AlarmNotificationPayload> = {
    subtle: {
      title: 'Time to reconnect 🌿',
      body: "A gentle reminder: your next 10-second meditation is ready. You've got this.",
      level: 'subtle',
    },
    mild: {
      title: 'Your body is calling 🌙',
      body: 'You may be feeling a little fatigued. A quick meditation can restore your energy.',
      level: 'mild',
    },
    disease: {
      title: 'Rebalancing needed 🌊',
      body: 'Your system is signalling an imbalance. Return to your practice with compassion — you are not behind.',
      level: 'disease',
    },
    critical: {
      title: 'Urgent: please meditate now 🔴',
      body: 'Your mind and body need immediate care. Stop for 10 seconds — you are supported.',
      level: 'critical',
    },
  };

  return level === 'none' ? null : payloads[level];
}
