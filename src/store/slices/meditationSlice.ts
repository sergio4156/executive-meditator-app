import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type AlarmLevel = 'none' | 'subtle' | 'mild' | 'disease' | 'critical';

interface MeditationSliceState {
  currentWeek: 1 | 2 | 3;
  alarmLevel: AlarmLevel;
}

const initialState: MeditationSliceState = {
  currentWeek: 1,
  alarmLevel: 'none',
};

const meditationSlice = createSlice({
  name: 'meditation',
  initialState,
  reducers: {
    setCurrentWeek(state, action: PayloadAction<1 | 2 | 3>) {
      state.currentWeek = action.payload;
    },
    setAlarmLevel(state, action: PayloadAction<AlarmLevel>) {
      state.alarmLevel = action.payload;
    },
  },
});

export const {setCurrentWeek, setAlarmLevel} = meditationSlice.actions;
export default meditationSlice.reducer;
