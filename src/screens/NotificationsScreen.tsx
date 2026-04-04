/**
 * NotificationsScreen — Inbox for in-app notifications and alarm history.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppDispatch, useAppSelector} from '@/store';
import {markRead, markAllRead, clearNotifications} from '@/store/slices/notificationSlice';
import {Card} from '@/components/Card';
import {theme} from '@/theme';
import type {AppNotification} from '@/store/slices/notificationSlice';

const TYPE_ICONS: Record<AppNotification['type'], string> = {
  meditation_reminder: '☯',
  alarm: '⚠️',
  general: '💬',
};


function NotificationItem({notification}: {notification: AppNotification}) {
  const dispatch = useAppDispatch();

  const borderColor =
    notification.type === 'alarm'
      ? theme.colors.alarmMild
      : notification.read
      ? theme.colors.border
      : theme.colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => dispatch(markRead(notification.id))}>
      <Card
        style={[
          styles.notifCard,
          ...(notification.read ? [] : [styles.notifCardUnread]),
          {borderLeftColor: borderColor},
        ]}>
        <Text style={styles.notifIcon}>
          {TYPE_ICONS[notification.type]}
        </Text>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{notification.title}</Text>
          <Text style={styles.notifBody}>{notification.body}</Text>
          <Text style={styles.notifTime}>
            {new Date(notification.receivedAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {new Date(notification.receivedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </Card>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const {notifications, unreadCount} = useAppSelector(s => s.notifications);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => dispatch(markAllRead())}>
              <Text style={styles.actionText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(clearNotifications())}>
              <Text style={[styles.actionText, {color: theme.colors.error}]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>All quiet</Text>
          <Text style={styles.emptySubtitle}>
            Your meditation reminders and alarms will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({item}) => <NotificationItem notification={item} />}
          ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: theme.colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerActions: {flexDirection: 'row', gap: theme.spacing.md},
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  list: {padding: theme.spacing.md, paddingTop: 0},
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
  },
  notifCardUnread: {
    backgroundColor: theme.colors.elevated,
  },
  notifIcon: {fontSize: 22, marginTop: 2},
  notifContent: {flex: 1},
  notifTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  notifBody: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyIcon: {fontSize: 64},
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
