/**
 * OneSignal push notification service.
 * Notifications are vibration-only (no sound).
 */
import OneSignal from 'react-native-onesignal';
import {acknowledgeReminder} from '@/services/scheduler';
import {store} from '@/store';
import {setFcmPermission, setFcmToken, addNotification} from '@/store/slices/notificationSlice';
import {setAlarmLevel} from '@/store/slices/meditationSlice';
import {saveOneSignalId} from '@/services/supabase/database';
import {track} from '@/services/analytics';
import {supabase} from '@/config/supabase';
import type {AlarmLevel} from '@/store/slices/meditationSlice';

// TODO: read from env via react-native-config once a staging environment exists
// (requires adding react-native-config and touching native iOS/Android build config)
const ONESIGNAL_APP_ID = '47644693-c8cb-4fca-8d72-544a2ddf52fe';

export async function initializeNotifications() {
  if (__DEV__) {
    OneSignal.setLogLevel(6, 0);
  }

  OneSignal.setAppId(ONESIGNAL_APP_ID);
  // Note: the 'meditation_reminders' Android notification channel (silent + vibration-only)
  // is created in MainApplication.kt on app startup. To use it, set
  // android_channel_id: 'meditation_reminders' in any notification sent via the OneSignal API.

  OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
    store.dispatch(setFcmPermission(accepted));
  });

  OneSignal.getDeviceState().then(async (state: any) => {
    if (state?.userId) {
      store.dispatch(setFcmToken(state.userId));
      const {data: sessionData} = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        await saveOneSignalId(uid, state.userId).catch(console.warn);
      }
    }
  });

  OneSignal.setNotificationWillShowInForegroundHandler((event: any) => {
    const notif = event.getNotification();

    store.dispatch(
      addNotification({
        id: notif.notificationId,
        title: notif.title ?? 'Executive Meditator',
        body: notif.body ?? '',
        type: notif.additionalData?.type ?? 'general',
        receivedAt: Date.now(),
        read: false,
      }),
    );

    const alarmLevel = notif.additionalData?.alarmLevel as AlarmLevel;
    if (alarmLevel) {
      store.dispatch(setAlarmLevel(alarmLevel));
    }

    // Display notification without sound — vibration only
    // Sound is disabled via OneSignal dashboard notification settings
    event.complete(notif);
  });

  OneSignal.setNotificationOpenedHandler((_openedEvent: any) => {
    acknowledgeReminder();
    // DIAGNOSTIC, not a success metric. The intended behaviour when a reminder
    // arrives is to pause where you are and NOT touch the phone, so a low tap
    // rate is consistent with the product working exactly as designed. Useful
    // for spotting a sudden drop (delivery broken); misleading as "engagement".
    track('reminder_opened', {week: store.getState().meditation.currentWeek});
  });
}

/**
 * Current push permission as OneSignal sees it.
 *
 * Read on foreground rather than trusted from the prompt response: the prompt
 * only fires once, and the interesting case is a user revoking permission in OS
 * settings weeks later — which is our earliest churn signal and is invisible
 * from inside the app unless we look.
 */
export async function getPushPermission(): Promise<boolean | null> {
  try {
    const state: any = await OneSignal.getDeviceState();
    if (state == null) {return null;}
    return Boolean(state.hasNotificationPermission);
  } catch {
    return null;
  }
}

/**
 * Save the current OneSignal player ID for the given user.
 * Called when auth flips to logged-in, since OneSignal may have registered
 * before the session existed (fresh install path).
 */
export async function syncOneSignalIdForUser(uid: string) {
  try {
    const state: any = await OneSignal.getDeviceState();
    if (state?.userId) {
      store.dispatch(setFcmToken(state.userId));
      await saveOneSignalId(uid, state.userId);
    }
  } catch (err) {
    console.warn('syncOneSignalIdForUser failed:', err);
  }
}
