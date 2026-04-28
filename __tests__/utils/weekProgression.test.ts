import {deriveWeek, daysUntilNextWeek} from '../../src/utils/weekProgression';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-04-28T12:00:00.000Z').getTime();

const daysAgo = (days: number) =>
  new Date(NOW - days * DAY_MS).toISOString();

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('deriveWeek', () => {
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

  it('returns 3 well past day 14', () => {
    expect(deriveWeek(daysAgo(100))).toBe(3);
  });

  it('returns 1 when paidAt is in the future (clock skew)', () => {
    expect(deriveWeek(daysAgo(-1))).toBe(1);
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

  it('returns null at the week-3 transition', () => {
    expect(daysUntilNextWeek(daysAgo(14))).toBeNull();
  });

  it('returns null well past day 14', () => {
    expect(daysUntilNextWeek(daysAgo(100))).toBeNull();
  });
});
