import meditationReducer, {
  startMeditation,
  tick,
  pauseMeditation,
  resumeMeditation,
  skipMeditation,
  completeMeditation,
  resetSessionUI,
  setAlarmLevel,
  setCurrentWeek,
  GUIDANCE_TEXTS,
} from '../../src/store/slices/meditationSlice';

const initialState = meditationReducer(undefined, {type: '@@INIT'});

describe('meditationSlice', () => {
  it('has idle state by default', () => {
    expect(initialState.sessionState).toBe('idle');
    expect(initialState.remainingSeconds).toBe(10);
  });

  it('startMeditation sets state to active', () => {
    const state = meditationReducer(initialState, startMeditation());
    expect(state.sessionState).toBe('active');
    expect(state.guidance).toBe(GUIDANCE_TEXTS.active);
  });

  it('tick decrements remainingSeconds', () => {
    const activeState = meditationReducer(initialState, startMeditation());
    const afterTick = meditationReducer(activeState, tick());
    expect(afterTick.remainingSeconds).toBe(9);
  });

  it('tick does nothing when not active', () => {
    const after = meditationReducer(initialState, tick());
    expect(after.remainingSeconds).toBe(10);
  });

  it('pauseMeditation transitions to paused', () => {
    const active = meditationReducer(initialState, startMeditation());
    const paused = meditationReducer(active, pauseMeditation());
    expect(paused.sessionState).toBe('paused');
  });

  it('resumeMeditation transitions back to active', () => {
    const active = meditationReducer(initialState, startMeditation());
    const paused = meditationReducer(active, pauseMeditation());
    const resumed = meditationReducer(paused, resumeMeditation());
    expect(resumed.sessionState).toBe('active');
  });

  it('skipMeditation resets to idle', () => {
    const active = meditationReducer(initialState, startMeditation());
    const skipped = meditationReducer(active, skipMeditation());
    expect(skipped.sessionState).toBe('idle');
  });

  it('completeMeditation increments stats and adds to history', () => {
    const session = {
      id: 'test_session',
      startedAt: Date.now() - 10000,
      completedAt: Date.now(),
      durationSeconds: 10,
      week: 1 as const,
      skipped: false,
      pointsEarned: 10,
    };
    const completed = meditationReducer(initialState, completeMeditation(session));
    expect(completed.sessionState).toBe('completed');
    expect(completed.stats.totalSessions).toBe(1);
    expect(completed.stats.totalPoints).toBe(10);
    expect(completed.history).toHaveLength(1);
    expect(completed.stats.badges).toContain('first_meditation');
  });

  it('resetSessionUI returns to idle', () => {
    const active = meditationReducer(initialState, startMeditation());
    const reset = meditationReducer(active, resetSessionUI());
    expect(reset.sessionState).toBe('idle');
  });

  it('setAlarmLevel updates alarm level', () => {
    const state = meditationReducer(initialState, setAlarmLevel('critical'));
    expect(state.alarmLevel).toBe('critical');
  });

  it('setCurrentWeek updates week', () => {
    const state = meditationReducer(initialState, setCurrentWeek(3));
    expect(state.currentWeek).toBe(3);
  });
});
