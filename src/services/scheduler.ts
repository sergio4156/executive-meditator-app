/**
 * Meditation Scheduler
 *
 * Tracks the interval between reminders and escalates the alarm level
 * when the user hasn't engaged for longer than the current week's interval.
 * Runs as a foreground 60-second heartbeat — OneSignal handles background delivery.
 */
import {store} from '@/store';
import {setAlarmLevel} from '@/store/slices/meditationSlice';
import {addNotification} from '@/store/slices/notificationSlice';
import {WEEK_CONFIG} from '@/utils/meditation';
import {getAlarmLevel, getAlarmNotification} from '@/utils/alarms';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let missedSessions = 0;
let lastAcknowledgedAt: number = Date.now();

// TODO: startScheduler() is never called. Wire it up in AppNavigator once
// onboardingComplete becomes true, and call stopScheduler() on sign-out.
// Guard against double-starts — stopScheduler() inside handles that already.
export function startScheduler() {
  stopScheduler();
  schedulerInterval = setInterval(checkSchedule, 60_000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

function checkSchedule() {
  const state = store.getState();
  const week = state.meditation.currentWeek;
  const intervalMs = WEEK_CONFIG[week].intervalMinutes * 60 * 1000;
  const now = Date.now();

  if (now - lastAcknowledgedAt > intervalMs) {
    missedSessions += 1;
    const level = getAlarmLevel(missedSessions);
    store.dispatch(setAlarmLevel(level));

    const payload = getAlarmNotification(level);
    if (payload) {
      store.dispatch(
        addNotification({
          id: `alarm_${now}`,
          title: payload.title,
          body: payload.body,
          type: 'alarm',
          receivedAt: now,
          read: false,
        }),
      );
    }
  }
}

/** Call when the user acknowledges a reminder (e.g. opens the app). */
export function acknowledgeReminder() {
  missedSessions = 0;
  lastAcknowledgedAt = Date.now();
  store.dispatch(setAlarmLevel('none'));
}
