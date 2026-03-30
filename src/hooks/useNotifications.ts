/**
 * useNotifications — access notification state and helpers.
 */
import {useAppDispatch, useAppSelector} from '@/store';
import {markAllRead, clearNotifications} from '@/store/slices/notificationSlice';

export function useNotifications() {
  const dispatch = useAppDispatch();
  const {notifications, unreadCount, fcmPermissionGranted, fcmToken} =
    useAppSelector(s => s.notifications);

  return {
    notifications,
    unreadCount,
    permissionGranted: fcmPermissionGranted,
    playerId: fcmToken,
    markAllRead: () => dispatch(markAllRead()),
    clearAll: () => dispatch(clearNotifications()),
  };
}
