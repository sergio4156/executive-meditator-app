import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  // TODO: add 'meditation_end' — Edge Function sends type: 'meditation_end' for the closing notification
  type: 'meditation_reminder' | 'alarm' | 'general';
  receivedAt: number;
  read: boolean;
}

interface NotificationState {
  fcmPermissionGranted: boolean;
  fcmToken: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  onboardingComplete: boolean;
  awakeStart: number;
  awakeEnd: number;
}

const initialState: NotificationState = {
  fcmPermissionGranted: false,
  fcmToken: null,
  notifications: [],
  unreadCount: 0,
  onboardingComplete: false,
  awakeStart: 7,
  awakeEnd: 22,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFcmPermission(state, action: PayloadAction<boolean>) {
      state.fcmPermissionGranted = action.payload;
    },
    setFcmToken(state, action: PayloadAction<string>) {
      state.fcmToken = action.payload;
    },
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAllRead(state) {
      state.notifications = state.notifications.map(n => ({...n, read: true}));
      state.unreadCount = 0;
    },
    markRead(state, action: PayloadAction<string>) {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
    },
    completeOnboarding(
      state,
      action: PayloadAction<{awakeStart: number; awakeEnd: number}>,
    ) {
      state.awakeStart = action.payload.awakeStart;
      state.awakeEnd = action.payload.awakeEnd;
      state.onboardingComplete = true;
    },
    resetOnboarding(state) {
      state.onboardingComplete = false;
    },
  },
});

export const {
  setFcmPermission,
  setFcmToken,
  addNotification,
  markAllRead,
  markRead,
  clearNotifications,
  completeOnboarding,
  resetOnboarding,
} = notificationSlice.actions;

export default notificationSlice.reducer;
