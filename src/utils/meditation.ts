export interface WeekConfig {
  week: 1 | 2 | 3;
  intervalMinutes: number;
  description: string;
}

export const WEEK_CONFIG: Record<1 | 2 | 3, WeekConfig> = {
  1: {
    week: 1,
    intervalMinutes: 60,
    description: '10-second meditation every hour',
  },
  2: {
    week: 2,
    intervalMinutes: 30,
    description: '10-second meditation every 30 minutes',
  },
  3: {
    week: 3,
    intervalMinutes: 15,
    description: '10-second meditation every 15 minutes',
  },
};
