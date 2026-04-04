import meditationReducer, {
  setCurrentWeek,
  setAlarmLevel,
} from '../../src/store/slices/meditationSlice';

describe('meditationSlice', () => {
  it('has correct initial state', () => {
    const state = meditationReducer(undefined, {type: '@@INIT'});
    expect(state.currentWeek).toBe(1);
    expect(state.alarmLevel).toBe('none');
  });

  it('setCurrentWeek updates the week', () => {
    const state = meditationReducer(undefined, setCurrentWeek(2));
    expect(state.currentWeek).toBe(2);
  });

  it('setAlarmLevel updates the alarm level', () => {
    const state = meditationReducer(undefined, setAlarmLevel('mild'));
    expect(state.alarmLevel).toBe('mild');
  });
});
