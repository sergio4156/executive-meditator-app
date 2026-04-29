import {
  deriveWeek,
  daysUntilNextWeek,
  isFirstCycleComplete,
} from '../../src/utils/weekProgression';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-04-29T12:00:00.000Z').getTime();

const daysAgo = (days: number) =>
  new Date(NOW - days * DAY_MS).toISOString();

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('deriveWeek (first cycle)', () => {
  it('returns 1 when paidAt is null', () => {
    expect(deriveWeek(null)).toBe(1);
  });

  it('returns 1 on day 0 (just paid)', () => {
    expect(deriveWeek(daysAgo(0))).toBe(1);
  });

  it('returns 1 just before the day-7 boundary', () => {
    expect(deriveWeek(daysAgo(6.99))).toBe(1);
  });

  it('returns 2 exactly at day 7', () => {
    expect(deriveWeek(daysAgo(7))).toBe(2);
  });

  it('returns 2 just before the day-14 boundary', () => {
    expect(deriveWeek(daysAgo(13.99))).toBe(2);
  });

  it('returns 3 exactly at day 14', () => {
    expect(deriveWeek(daysAgo(14))).toBe(3);
  });

  it('returns 3 just before the day-21 cycle wrap', () => {
    expect(deriveWeek(daysAgo(20.99))).toBe(3);
  });

  it('returns 1 when paidAt is in the future (clock skew)', () => {
    expect(deriveWeek(daysAgo(-1))).toBe(1);
  });
});

describe('deriveWeek (loop after first cycle)', () => {
  it('wraps back to week 1 exactly at day 21', () => {
    expect(deriveWeek(daysAgo(21))).toBe(1);
  });

  it('returns week 2 at day 28 (cycle 2 week 2)', () => {
    expect(deriveWeek(daysAgo(28))).toBe(2);
  });

  it('returns week 3 at day 35 (cycle 2 week 3)', () => {
    expect(deriveWeek(daysAgo(35))).toBe(3);
  });

  it('wraps again at day 42 (cycle 3 week 1)', () => {
    expect(deriveWeek(daysAgo(42))).toBe(1);
  });

  it('handles arbitrary far-future days correctly (day 100)', () => {
    // 100 % 21 = 16 → week 3
    expect(deriveWeek(daysAgo(100))).toBe(3);
  });
});

describe('daysUntilNextWeek', () => {
  it('returns 7 when paidAt is null', () => {
    expect(daysUntilNextWeek(null)).toBe(7);
  });

  it('returns 7 on day 0', () => {
    expect(daysUntilNextWeek(daysAgo(0))).toBe(7);
  });

  it('rounds up partial days remaining in week 1', () => {
    expect(daysUntilNextWeek(daysAgo(0.5))).toBe(7);
    expect(daysUntilNextWeek(daysAgo(6.1))).toBe(1);
  });

  it('returns 7 exactly at the week-2 transition', () => {
    expect(daysUntilNextWeek(daysAgo(7))).toBe(7);
  });

  it('rounds up partial days remaining in week 2', () => {
    expect(daysUntilNextWeek(daysAgo(13.1))).toBe(1);
  });

  it('counts down to the cycle wrap during week 3', () => {
    // day 14 → 21 - 14 = 7 days until week 1 again
    expect(daysUntilNextWeek(daysAgo(14))).toBe(7);
    // day 20.5 → ceil(0.5) = 1 day until wrap
    expect(daysUntilNextWeek(daysAgo(20.5))).toBe(1);
  });

  it('resets after the cycle wraps', () => {
    // day 21 → cycle day 0 → 7 days until week 2
    expect(daysUntilNextWeek(daysAgo(21))).toBe(7);
  });
});

describe('isFirstCycleComplete', () => {
  it('returns false when paidAt is null', () => {
    expect(isFirstCycleComplete(null)).toBe(false);
  });

  it('returns false during the first cycle', () => {
    expect(isFirstCycleComplete(daysAgo(0))).toBe(false);
    expect(isFirstCycleComplete(daysAgo(14))).toBe(false);
    expect(isFirstCycleComplete(daysAgo(20.99))).toBe(false);
  });

  it('returns true exactly at day 21 (first cycle just completed)', () => {
    expect(isFirstCycleComplete(daysAgo(21))).toBe(true);
  });

  it('returns true well past the first cycle', () => {
    expect(isFirstCycleComplete(daysAgo(100))).toBe(true);
  });

  it('returns false when paidAt is in the future (clock skew)', () => {
    expect(isFirstCycleComplete(daysAgo(-1))).toBe(false);
  });
});
