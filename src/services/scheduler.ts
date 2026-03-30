/**
 * Meditation Scheduler
 *
 * Handles the client-side interval logic that:
 *  1. Determines when the next meditation is due (based on current week config)
 *  2. Increments the missed-session counter
 *  3. Calculates and dispatches the appropriate alarm level
 *
 * For production apps, server-side scheduling via Cloud Functions + FCM
 * is strongly recommended so notifications fire even when the app is closed.
 * This module handles the in-app foreground scheduler as a complement.
 */
import {store} from '@/store';
import {setAlarmLevel} from '@/store/slices/meditationSlice';
import {addNotification} from '@/store/slices/notificationSlice';
import {WEEK_CONFIG} from '@/utils/meditation';
import {getAlarmLevel, getAlarmNotification} from '@/utils/alarms';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let missedSessions = 0;
let lastCompletedAt: number = Date.now();

/**
 * Start the in-app scheduler.
 * Call this after the user signs in; clear it on sign-out.
 */
export function startScheduler() {
  stopScheduler();

  // Check every 60 seconds whether a session is overdue
  schedulerInterval = setInterval(checkSchedule, 60_000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

/** Call this whenever a meditation is completed or skipped. */
export function recordMeditationActivity(completed: boolean) {
  if (completed) {
    missedSessions = 0;
    lastCompletedAt = Date.now();
    store.dispatch(setAlarmLevel('none'));
  } else {
    missedSessions += 1;
    applyAlarm();
  }
}

function checkSchedule() {
  const state = store.getState();
  const week = state.meditation.currentWeek;
  const intervalMs = WEEK_CONFIG[week].intervalMinutes * 60 * 1000;
  const now = Date.now();

  if (now - lastCompletedAt > intervalMs) {
    missedSessions += 1;
    applyAlarm();
  }
}

function applyAlarm() {
  const level = getAlarmLevel(missedSessions);
  store.dispatch(setAlarmLevel(level));

  const payload = getAlarmNotification(level);
  if (payload) {
    store.dispatch(
      addNotification({
        id: `alarm_${Date.now()}`,
        title: payload.title,
        body: payload.body,
        type: 'alarm',
        receivedAt: Date.now(),
        read: false,
      }),
    );
  }
}
