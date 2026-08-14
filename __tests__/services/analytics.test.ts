/**
 * Analytics guards.
 *
 * These test the two pieces that fail SILENTLY if they regress — the failure
 * mode is not a crash but a wrong number in an investor report months later,
 * which is exactly the kind of bug nobody notices in time.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  track,
  identify,
  resetIdentity,
  clearMarkers,
  trackWeekReached,
  trackPushPermission,
  daysEnrolled,
} from '@/services/analytics';

const mock = (global as any).__analyticsMock;

beforeEach(async () => {
  await AsyncStorage.clear();
  mock.logEvent.mockClear();
  mock.setUserId.mockClear();
});

describe('track', () => {
  it('forwards the event name and properties', () => {
    track('onboarding_completed', {awake_window_hours: 15});
    expect(mock.logEvent).toHaveBeenCalledWith('onboarding_completed', {
      awake_window_hours: 15,
    });
  });

  it('sends an empty property object rather than undefined', () => {
    track('login_completed');
    expect(mock.logEvent).toHaveBeenCalledWith('login_completed', {});
  });

  it('never throws when the native module rejects', () => {
    mock.logEvent.mockRejectedValueOnce(new Error('native module missing'));
    expect(() => track('login_completed')).not.toThrow();
  });
});

describe('identity', () => {
  it('binds and clears the user id', async () => {
    identify('uid-1');
    expect(mock.setUserId).toHaveBeenCalledWith('uid-1');
    resetIdentity();
    expect(mock.setUserId).toHaveBeenCalledWith(null);
  });
});

describe('trackWeekReached', () => {
  it('logs the first time a week is seen', async () => {
    await trackWeekReached('uid-1', 1);
    expect(mock.logEvent).toHaveBeenCalledWith('program_week_reached', {week: 1});
  });

  it('does NOT log the same week twice', async () => {
    // The week is derived from paid_at on every launch, so without the guard
    // this event would fire once per app open and inflate the funnel by however
    // often each user happens to open the app.
    await trackWeekReached('uid-1', 1);
    await trackWeekReached('uid-1', 1);
    await trackWeekReached('uid-1', 1);
    expect(mock.logEvent).toHaveBeenCalledTimes(1);
  });

  it('logs again when the week actually changes', async () => {
    await trackWeekReached('uid-1', 1);
    await trackWeekReached('uid-1', 2);
    expect(mock.logEvent).toHaveBeenCalledTimes(2);
    expect(mock.logEvent).toHaveBeenLastCalledWith('program_week_reached', {week: 2});
  });

  it('logs week 1 again on the next cycle, since the program loops', async () => {
    // week 3 -> week 1 is a real transition (cycle 2), not a repeat. A
    // high-water-mark guard would wrongly swallow this.
    await trackWeekReached('uid-1', 3);
    mock.logEvent.mockClear();
    await trackWeekReached('uid-1', 1);
    expect(mock.logEvent).toHaveBeenCalledWith('program_week_reached', {week: 1});
  });

  it('tracks each user independently on a shared device', async () => {
    await trackWeekReached('uid-1', 2);
    await trackWeekReached('uid-2', 2);
    expect(mock.logEvent).toHaveBeenCalledTimes(2);
  });
});

describe('trackPushPermission', () => {
  it('does not report churn for a user who never granted permission', async () => {
    // Never opting in is failure to activate, not churn. Conflating them would
    // overstate churn with every user who declined the initial prompt.
    await trackPushPermission('uid-1', false);
    expect(mock.logEvent).not.toHaveBeenCalled();
  });

  it('reports churn only on the granted -> off transition', async () => {
    await trackPushPermission('uid-1', true);
    expect(mock.logEvent).not.toHaveBeenCalled();

    await trackPushPermission('uid-1', false, 9);
    expect(mock.logEvent).toHaveBeenCalledWith('notifications_disabled', {
      days_enrolled: 9,
    });
  });

  it('does not report the same churn twice', async () => {
    await trackPushPermission('uid-1', true);
    await trackPushPermission('uid-1', false, 9);
    await trackPushPermission('uid-1', false, 10);
    expect(mock.logEvent).toHaveBeenCalledTimes(1);
  });

  it('can report churn again after the user re-enables', async () => {
    await trackPushPermission('uid-1', true);
    await trackPushPermission('uid-1', false, 3);
    await trackPushPermission('uid-1', true);
    await trackPushPermission('uid-1', false, 12);
    expect(mock.logEvent).toHaveBeenCalledTimes(2);
  });

  it('omits days_enrolled when it is unknown', async () => {
    await trackPushPermission('uid-1', true);
    await trackPushPermission('uid-1', false);
    expect(mock.logEvent).toHaveBeenCalledWith('notifications_disabled', {});
  });
});

describe('clearMarkers', () => {
  it('lets a re-signed-in user re-log their current week', async () => {
    await trackWeekReached('uid-1', 2);
    await clearMarkers('uid-1');
    mock.logEvent.mockClear();
    await trackWeekReached('uid-1', 2);
    expect(mock.logEvent).toHaveBeenCalledWith('program_week_reached', {week: 2});
  });
});

describe('daysEnrolled', () => {
  it('returns undefined without a paid_at', () => {
    expect(daysEnrolled(null)).toBeUndefined();
  });

  it('floors to whole days', () => {
    const twoAndAHalfDaysAgo = new Date(Date.now() - 2.5 * 86_400_000).toISOString();
    expect(daysEnrolled(twoAndAHalfDaysAgo)).toBe(2);
  });

  it('treats a future paid_at as day 0 rather than a negative', () => {
    // Clock skew is real; a negative day count would poison any churn-timing
    // aggregate it landed in.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(daysEnrolled(tomorrow)).toBe(0);
  });

  it('returns 0 for an unparseable date rather than NaN', () => {
    expect(daysEnrolled('not-a-date')).toBe(0);
  });
});
