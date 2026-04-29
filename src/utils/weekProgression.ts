/**
 * Auto-progression of the meditation program based on time since payment.
 *
 * One cycle is 21 days, looping indefinitely:
 *   Days 0–6   → week 1 (60-min interval)
 *   Days 7–13  → week 2 (30-min interval)
 *   Days 14–20 → week 3 (15-min interval)
 *   Day 21+    → repeats from week 1 (cycle 2), and so on.
 *
 * Whether the loop continues past the first cycle is gated on the
 * `loop_enabled` profile column server-side. The math here always returns
 * a week regardless — the Edge Function and UI decide what to do with it.
 *
 * Keep in sync with the deriveWeek() copy in
 * supabase/functions/send-reminders/index.ts — that copy decides actual
 * push cadence; this copy drives the in-app UI.
 */
const DAY_MS = 86_400_000;
const CYCLE_DAYS = 21;

function cycleDay(paidAt: string): number {
  const days = (Date.now() - new Date(paidAt).getTime()) / DAY_MS;
  // Clock skew (paidAt in future) → treat as day 0, not "end of last cycle".
  if (days < 0) return 0;
  return days % CYCLE_DAYS;
}

export function deriveWeek(paidAt: string | null): 1 | 2 | 3 {
  if (!paidAt) return 1;
  const d = cycleDay(paidAt);
  if (d < 7) return 1;
  if (d < 14) return 2;
  return 3;
}

/**
 * Whole days remaining until the user's week changes. Always returns a
 * number — there's no "final week" because the program loops.
 */
export function daysUntilNextWeek(paidAt: string | null): number {
  if (!paidAt) return 7;
  const d = cycleDay(paidAt);
  if (d < 7) return Math.ceil(7 - d);
  if (d < 14) return Math.ceil(14 - d);
  return Math.ceil(CYCLE_DAYS - d);
}

/**
 * True once the user has completed at least one full 21-day cycle.
 * Drives whether the Settings-screen loop on/off toggle is rendered.
 */
export function isFirstCycleComplete(paidAt: string | null): boolean {
  if (!paidAt) return false;
  const days = (Date.now() - new Date(paidAt).getTime()) / DAY_MS;
  return days >= CYCLE_DAYS;
}
