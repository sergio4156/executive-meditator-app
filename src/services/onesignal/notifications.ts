/**
 * OneSignal push notification service (v4 — compatible with RN 0.74)
 *
 * SETUP STEPS:
 * 1. Create a free account at https://onesignal.com
 * 2. Create an app → select "Apple iOS" platform
 * 3. Upload your APNs certificate (Xcode → Signing & Capabilities → Push Notifications)
 * 4. Copy your OneSignal App ID into .env as ONESIGNAL_APP_ID
 */
import OneSignal from 'react-native-onesignal';
import {store} from '@/store';
import {setFcmPermission, setFcmToken, addNotification} from '@/store/slices/notificationSlice';
import {setAlarmLevel} from '@/store/slices/meditationSlice';
import {saveOneSignalId} from '@/services/supabase/database';
import {supabase} from '@/config/supabase';
import type {AlarmLevel} from '@/store/slices/meditationSlice';

const ONESIGNAL_APP_ID =
  process.env.ONESIGNAL_APP_ID ?? 'your-onesignal-app-id';

export async function initializeNotifications() {
  if (__DEV__) {
    OneSignal.setLogLevel(6, 0); // verbose
  }

  OneSignal.setAppId(ONESIGNAL_APP_ID);

  // Request push permission
  OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
    store.dispatch(setFcmPermission(accepted));
  });

  // Store the player ID
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

  // Foreground notification received
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

    // Show the notification while in foreground
    event.complete(notif);
  });

  // Notification tapped
  OneSignal.setNotificationOpenedHandler((openedEvent: any) => {
    console.log('[OneSignal] Notification opened:', openedEvent.notification.notificationId);
  });
}
