/**
 * Meditation Slice
 *
 * Manages:
 *  - The active meditation session (timer, state machine)
 *  - The user's current program week (1 / 2 / 3)
 *  - Accumulated stats: total sessions, streak, points, badges
 *  - History of completed sessions (mirrored from Firestore)
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

// ---------- Types ----------

export type MeditationState = 'idle' | 'countdown' | 'active' | 'paused' | 'completed';

export type AlarmLevel = 'none' | 'subtle' | 'mild' | 'disease' | 'critical';

export interface MeditationSession {
  id: string;
  startedAt: number;   // Unix ms
  completedAt: number; // Unix ms
  durationSeconds: number;
  week: 1 | 2 | 3;
  skipped: boolean;
  pointsEarned: number;
}

export interface MeditationStats {
  totalSessions: number;
  completedToday: number;
  streak: number;           // consecutive days with at least one completion
  totalPoints: number;
  badges: string[];         // badge IDs awarded
  onenessReached: boolean;  // "irreversible experience of Oneness" milestone
  weeklyCompletionRate: number; // 0-1
}

interface MeditationSliceState {
  /** Active session */
  sessionState: MeditationState;
  sessionStartedAt: number | null;
  remainingSeconds: number;
  alarmLevel: AlarmLevel;
  guidance: string;

  /** Program config */
  currentWeek: 1 | 2 | 3;

  /** Aggregated stats (loaded from Firestore, updated optimistically) */
  stats: MeditationStats;

  /** Paginated session history */
  history: MeditationSession[];
  historyLoading: boolean;
}

// ---------- Guidance texts ----------

export const GUIDANCE_TEXTS = {
  prepare: 'Prepare: eyes up-right, open awareness',
  active: 'Joyful anticipation — breathe and open',
  listen: 'Open-eyed listening — receive what arises',
  complete: 'Beautiful. You are one step closer to Oneness.',
};

// ---------- Points table ----------

const POINTS = {
  complete: 10,
  streak3: 5,
  streak7: 15,
  onenessBonus: 100,
};

// ---------- Initial state ----------

const initialStats: MeditationStats = {
  totalSessions: 0,
  completedToday: 0,
  streak: 0,
  totalPoints: 0,
  badges: [],
  onenessReached: false,
  weeklyCompletionRate: 0,
};

const initialState: MeditationSliceState = {
  sessionState: 'idle',
  sessionStartedAt: null,
  remainingSeconds: 10,
  alarmLevel: 'none',
  guidance: GUIDANCE_TEXTS.prepare,

  currentWeek: 1,

  stats: initialStats,

  history: [],
  historyLoading: false,
};

// ---------- Slice ----------

const meditationSlice = createSlice({
  name: 'meditation',
  initialState,
  reducers: {
    /** User taps "Begin" */
    startMeditation(state) {
      state.sessionState = 'active';
      state.sessionStartedAt = Date.now();
      state.remainingSeconds = 10;
      state.guidance = GUIDANCE_TEXTS.active;
      state.alarmLevel = 'none';
    },

    /** Countdown tick — call every second from the timer hook */
    tick(state) {
      if (state.sessionState !== 'active') return;
      if (state.remainingSeconds <= 5 && state.remainingSeconds > 0) {
        state.guidance = GUIDANCE_TEXTS.listen;
      }
      state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    },

    pauseMeditation(state) {
      if (state.sessionState === 'active') {
        state.sessionState = 'paused';
      }
    },

    resumeMeditation(state) {
      if (state.sessionState === 'paused') {
        state.sessionState = 'active';
      }
    },

    skipMeditation(state) {
      state.sessionState = 'idle';
      state.sessionStartedAt = null;
      state.remainingSeconds = 10;
      state.guidance = GUIDANCE_TEXTS.prepare;
    },

    completeMeditation(state, action: PayloadAction<MeditationSession>) {
      state.sessionState = 'completed';
      state.guidance = GUIDANCE_TEXTS.complete;

      // Optimistic stat update
      state.stats.totalSessions += 1;
      state.stats.completedToday += 1;
      state.stats.totalPoints += action.payload.pointsEarned;
      state.history.unshift(action.payload);

      // Streak handled server-side; update optimistically
      if (state.stats.completedToday === 1) {
        state.stats.streak += 1;
      }

      // Badge: first ever
      if (state.stats.totalSessions === 1) {
        state.stats.badges.push('first_meditation');
      }
      // Streak badges
      if (state.stats.streak === 3 && !state.stats.badges.includes('streak_3')) {
        state.stats.badges.push('streak_3');
        state.stats.totalPoints += POINTS.streak3;
      }
      if (state.stats.streak === 7 && !state.stats.badges.includes('streak_7')) {
        state.stats.badges.push('streak_7');
        state.stats.totalPoints += POINTS.streak7;
      }
    },

    resetSessionUI(state) {
      state.sessionState = 'idle';
      state.sessionStartedAt = null;
      state.remainingSeconds = 10;
      state.guidance = GUIDANCE_TEXTS.prepare;
    },

    setAlarmLevel(state, action: PayloadAction<AlarmLevel>) {
      state.alarmLevel = action.payload;
    },

    setCurrentWeek(state, action: PayloadAction<1 | 2 | 3>) {
      state.currentWeek = action.payload;
    },

    setStats(state, action: PayloadAction<MeditationStats>) {
      state.stats = action.payload;
    },

    setHistory(state, action: PayloadAction<MeditationSession[]>) {
      state.history = action.payload;
      state.historyLoading = false;
    },

    setHistoryLoading(state, action: PayloadAction<boolean>) {
      state.historyLoading = action.payload;
    },

    setOnenessReached(state) {
      if (!state.stats.onenessReached) {
        state.stats.onenessReached = true;
        state.stats.totalPoints += POINTS.onenessBonus;
        state.stats.badges.push('oneness');
      }
    },
  },
});

export const {
  startMeditation,
  tick,
  pauseMeditation,
  resumeMeditation,
  skipMeditation,
  completeMeditation,
  resetSessionUI,
  setAlarmLevel,
  setCurrentWeek,
  setStats,
  setHistory,
  setHistoryLoading,
  setOnenessReached,
} = meditationSlice.actions;

export default meditationSlice.reducer;
