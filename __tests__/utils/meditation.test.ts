import {WEEK_CONFIG} from '../../src/utils/meditation';

describe('WEEK_CONFIG', () => {
  it('has correct interval for week 1', () => {
    expect(WEEK_CONFIG[1].intervalMinutes).toBe(60);
  });

  it('has correct interval for week 2', () => {
    expect(WEEK_CONFIG[2].intervalMinutes).toBe(30);
  });

  it('has correct interval for week 3', () => {
    expect(WEEK_CONFIG[3].intervalMinutes).toBe(15);
  });
});
