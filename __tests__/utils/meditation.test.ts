import {
  getAlarmLevel,
  getAlarmNotification,
} from '../../src/utils/alarms';
import {
  hasReachedOneness,
  generateSessionId,
  WEEK_CONFIG,
  BADGES,
} from '../../src/utils/meditation';

describe('getAlarmLevel', () => {
  it('returns none for 0 missed sessions', () => {
    expect(getAlarmLevel(0)).toBe('none');
  });

  it('returns subtle for 1 missed session', () => {
    expect(getAlarmLevel(1)).toBe('subtle');
  });

  it('returns mild for 2-3 missed sessions', () => {
    expect(getAlarmLevel(2)).toBe('mild');
    expect(getAlarmLevel(3)).toBe('mild');
  });

  it('returns disease for 4-6 missed sessions', () => {
    expect(getAlarmLevel(4)).toBe('disease');
    expect(getAlarmLevel(6)).toBe('disease');
  });

  it('returns critical for 7+ missed sessions', () => {
    expect(getAlarmLevel(7)).toBe('critical');
    expect(getAlarmLevel(100)).toBe('critical');
  });
});

describe('getAlarmNotification', () => {
  it('returns null for none level', () => {
    expect(getAlarmNotification('none')).toBeNull();
  });

  it('returns a payload with title and body for each level', () => {
    const levels = ['subtle', 'mild', 'disease', 'critical'] as const;
    levels.forEach(level => {
      const payload = getAlarmNotification(level);
      expect(payload).not.toBeNull();
      expect(typeof payload!.title).toBe('string');
      expect(typeof payload!.body).toBe('string');
      expect(payload!.level).toBe(level);
    });
  });
});

describe('hasReachedOneness', () => {
  it('returns false if fewer than 3 weeks of data', () => {
    expect(hasReachedOneness([0.9, 0.9])).toBe(false);
  });

  it('returns true when last 3 weeks all >= 80%', () => {
    expect(hasReachedOneness([0.6, 0.85, 0.9, 0.8])).toBe(true);
  });

  it('returns false when any of last 3 weeks < 80%', () => {
    expect(hasReachedOneness([0.9, 0.9, 0.79])).toBe(false);
  });
});

describe('WEEK_CONFIG', () => {
  it('has entries for weeks 1, 2, 3', () => {
    expect(WEEK_CONFIG[1].intervalMinutes).toBe(60);
    expect(WEEK_CONFIG[2].intervalMinutes).toBe(30);
    expect(WEEK_CONFIG[3].intervalMinutes).toBe(15);
  });
});

describe('generateSessionId', () => {
  it('generates unique IDs', () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a).not.toBe(b);
    expect(a.startsWith('session_')).toBe(true);
  });
});

describe('BADGES', () => {
  it('includes at least 4 badges', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(4);
  });

  it('all badges have required fields', () => {
    BADGES.forEach(badge => {
      expect(badge.id).toBeTruthy();
      expect(badge.emoji).toBeTruthy();
      expect(badge.label).toBeTruthy();
    });
  });
});
