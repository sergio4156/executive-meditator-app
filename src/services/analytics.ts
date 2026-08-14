/**
 * Product analytics.
 *
 * WHY THIS EXISTS
 * Retention cannot be collected retroactively. Every day the app runs
 * uninstrumented is a day we can never report on, so this ships before launch
 * rather than after.
 *
 * WHAT WE MEASURE, AND WHY IT IS NOT "APP OPENS"
 * This product is deliberately passive — the Home screen says "no action needed
 * here", and a user doing the program correctly may never open the app after
 * setup. Standard engagement metrics (DAU, session count, app-open retention)
 * therefore UNDERSTATE this product badly, and should not be reported as
 * retention. True retention is "still enrolled and still receiving reminders",
 * which is a server-side fact derivable from Supabase (paid_at, schedule rows,
 * notification permission), not something an in-app event can observe.
 *
 * So the events below answer a narrower question: of the people who paid, how
 * many set the program up, how far through the 21-day cycle do they get, and
 * when do they switch the reminders off.
 *
 * PRIVACY
 * No email, name, or free text is ever sent as an event property — only the
 * Supabase user id (as the analytics user id) and small enumerated values.
 * This stays inside what we already declared to Apple and Google as
 * "app interactions"/"product interaction"; adding it means declaring the
 * additional PURPOSE of Analytics on both stores, not new data types.
 *
 * On Android, Firebase Analytics would normally pull in the AD_ID permission.
 * It is explicitly stripped — see android/app/src/main/AndroidManifest.xml.
 */
import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Every event this app is allowed to send. A closed union rather than free
 * strings: typos become type errors instead of a permanently-missing metric
 * nobody notices until it is needed.
 */
export type AnalyticsEvent =
  /** Session established (sign-in or restored session). Activation denominator. */
  | 'login_completed'
  /** Awake window chosen and program started. The activation event. */
  | 'onboarding_completed'
  /** User entered a new program week. Fires at most once per week per cycle. */
  | 'program_week_reached'
  /**
   * Deliberately NOT an event: cycle completion. It is a pure function of
   * paid_at (>= 21 days) and is queryable server-side for the whole user base
   * at once — including users who never open the app again, whom a client event
   * would silently miss. Same reasoning as retention.
   */
  /** Reminder notification tapped. DIAGNOSTIC ONLY — see note below. */
  | 'reminder_opened'
  /** Push permission observed as off after having been granted. Churn signal. */
  | 'notifications_disabled'
  /** Awake window edited after onboarding. Tuning vs. fighting the schedule. */
  | 'awake_window_changed'
  /** Looping past the first cycle turned on/off. Voluntary-continuation signal. */
  | 'loop_setting_changed'
  /** User opened the account-deletion request flow. Hard churn intent. */
  | 'account_deletion_requested';

/**
 * Event properties. Deliberately small and enumerable — no PII, no free text.
 * Firebase truncates and type-coerces silently, so keep values short scalars.
 */
export interface AnalyticsProps {
  /** Program week 1–3. */
  week?: 1 | 2 | 3;
  /** Length of the configured awake window, in whole hours. */
  awake_window_hours?: number;
  /** Whole days since the user paid. Buckets churn timing. */
  days_enrolled?: number;
  /** Boolean-valued setting after the change. */
  enabled?: boolean;
}

/** Prefix for the per-user "last week we logged" marker in AsyncStorage. */
const WEEK_MARKER_PREFIX = 'analytics:lastWeek:';
/** Prefix for the per-user "push was granted at least once" marker. */
const PUSH_GRANTED_PREFIX = 'analytics:pushGranted:';

/**
 * Analytics must never break the app. Firebase throws on some platforms when
 * the native module is missing (a bare simulator build, a test runner), and a
 * crash in a measurement call would be a self-inflicted outage in the product
 * we are trying to measure.
 */
async function safely(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (__DEV__) {
      console.warn('[analytics] suppressed:', err);
    }
  }
}

/** Record an event. Fire-and-forget; never awaited by UI code. */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  void safely(() => analytics().logEvent(event, props ?? {}));
}

/**
 * Bind events to the Supabase user id so app behaviour can be joined to the
 * purchase record. The id is an opaque UUID, not an email — it identifies a row
 * we already own rather than a person.
 */
export function identify(uid: string): void {
  void safely(() => analytics().setUserId(uid));
}

/** Clear identity on sign-out so a shared device does not merge two users. */
export function resetIdentity(): void {
  void safely(() => analytics().setUserId(null));
}

/**
 * Log `program_week_reached` at most once per user per week.
 *
 * The week is DERIVED from paid_at on every app launch (see
 * utils/weekProgression.ts) rather than stored, so without this guard the event
 * would fire on every single launch and the funnel would be meaningless —
 * inflated by however often each user happens to open the app, which is exactly
 * the bias this product cannot afford.
 *
 * The marker is per-user and stores the week we last reported. Because the
 * program loops (week 3 → week 1 of the next cycle), a CHANGE in week is the
 * trigger, not a high-water mark.
 */
export async function trackWeekReached(uid: string, week: 1 | 2 | 3): Promise<void> {
  const key = `${WEEK_MARKER_PREFIX}${uid}`;
  try {
    const last = await AsyncStorage.getItem(key);
    if (last === String(week)) return;
    await AsyncStorage.setItem(key, String(week));
    track('program_week_reached', {week});
  } catch {
    // Storage failure means we skip the event rather than risk double-counting.
  }
}

/**
 * Detect the reminders being switched off — our earliest churn signal, and the
 * one that matters most for a product whose whole value is the notification.
 *
 * Only meaningful as a transition: someone who never granted permission has not
 * churned, they never started. So we record that permission was granted once,
 * and only report `notifications_disabled` when it later reads as off.
 */
export async function trackPushPermission(
  uid: string,
  granted: boolean,
  daysEnrolled?: number,
): Promise<void> {
  const key = `${PUSH_GRANTED_PREFIX}${uid}`;
  try {
    if (granted) {
      await AsyncStorage.setItem(key, '1');
      return;
    }
    const hadGranted = await AsyncStorage.getItem(key);
    if (hadGranted !== '1') return;
    await AsyncStorage.removeItem(key);
    track('notifications_disabled', daysEnrolled === undefined ? {} : {days_enrolled: daysEnrolled});
  } catch {
    // Best-effort.
  }
}

/** Clear this user's analytics markers. Call on sign-out. */
export async function clearMarkers(uid: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      `${WEEK_MARKER_PREFIX}${uid}`,
      `${PUSH_GRANTED_PREFIX}${uid}`,
    ]);
  } catch {
    // Best-effort.
  }
}

/** Whole days since payment, or undefined when the user has no paid_at. */
export function daysEnrolled(paidAt: string | null): number | undefined {
  if (!paidAt) return undefined;
  const ms = Date.now() - new Date(paidAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}
