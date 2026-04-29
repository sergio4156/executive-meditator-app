import {getLocalHourMinute} from '../../src/utils/timezone';

describe('getLocalHourMinute', () => {
  it('returns the same hour for UTC tz', () => {
    const date = new Date('2026-04-29T15:30:00.000Z');
    expect(getLocalHourMinute(date, 'UTC')).toEqual({hour: 15, minute: 30});
  });

  it('shifts back 8 hours for Los_Angeles in standard time', () => {
    // 2026-01-15 is in PST (UTC-8). 16:00 UTC = 08:00 PST.
    const date = new Date('2026-01-15T16:00:00.000Z');
    expect(getLocalHourMinute(date, 'America/Los_Angeles')).toEqual({
      hour: 8,
      minute: 0,
    });
  });

  it('shifts back 7 hours for Los_Angeles in daylight time', () => {
    // 2026-07-15 is in PDT (UTC-7). 16:00 UTC = 09:00 PDT.
    const date = new Date('2026-07-15T16:00:00.000Z');
    expect(getLocalHourMinute(date, 'America/Los_Angeles')).toEqual({
      hour: 9,
      minute: 0,
    });
  });

  it('shifts forward for Tokyo (UTC+9, no DST)', () => {
    // 03:30 UTC = 12:30 in Tokyo (any season).
    const date = new Date('2026-06-15T03:30:00.000Z');
    expect(getLocalHourMinute(date, 'Asia/Tokyo')).toEqual({
      hour: 12,
      minute: 30,
    });
  });

  it('crosses the DST spring-forward boundary correctly', () => {
    // 2026 US DST starts 2026-03-08 at 02:00 local. Just before, in PST (UTC-8).
    const beforeJump = new Date('2026-03-08T09:30:00.000Z'); // 01:30 PST
    expect(getLocalHourMinute(beforeJump, 'America/Los_Angeles')).toEqual({
      hour: 1,
      minute: 30,
    });
    // After the spring-forward, PDT (UTC-7). 11:00 UTC = 04:00 PDT.
    const afterJump = new Date('2026-03-08T11:00:00.000Z');
    expect(getLocalHourMinute(afterJump, 'America/Los_Angeles')).toEqual({
      hour: 4,
      minute: 0,
    });
  });

  it('crosses the DST fall-back boundary correctly', () => {
    // 2026 US DST ends 2026-11-01. After the fall-back, PST (UTC-8).
    const afterFallback = new Date('2026-11-01T15:00:00.000Z');
    expect(getLocalHourMinute(afterFallback, 'America/Los_Angeles')).toEqual({
      hour: 7,
      minute: 0,
    });
  });

  it('handles dates that wrap a day boundary in the target tz', () => {
    // 2026-04-29 04:30 UTC is still 2026-04-28 21:30 PDT.
    const date = new Date('2026-04-29T04:30:00.000Z');
    expect(getLocalHourMinute(date, 'America/Los_Angeles')).toEqual({
      hour: 21,
      minute: 30,
    });
  });
});
