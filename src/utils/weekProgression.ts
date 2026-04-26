/**
 * Auto-progression of the meditation program based on time since payment.
 * Week 1 = days 0–6 (60-min interval)
 * Week 2 = days 7–13 (30-min interval)
 * Week 3 = day 14+ (15-min interval, permanent)
 */
const DAY_MS = 86_400_000;

export function deriveWeek(paidAt: string | null): 1 | 2 | 3 {
  if (!paidAt) return 1;
  const days = (Date.now() - new Date(paidAt).getTime()) / DAY_MS;
  if (days < 7) return 1;
  if (days < 14) return 2;
  return 3;
}

/**
 * Returns the number of whole days remaining until the next program week,
 * or null if the user is already on the final week.
 */
export function daysUntilNextWeek(paidAt: string | null): number | null {
  if (!paidAt) return 7;
  const days = (Date.now() - new Date(paidAt).getTime()) / DAY_MS;
  if (days < 7) return Math.ceil(7 - days);
  if (days < 14) return Math.ceil(14 - days);
  return null;
}
