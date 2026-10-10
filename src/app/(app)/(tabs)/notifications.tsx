import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { useMarkNotificationsRead, useNotifications, useUnreadCount } from "@/features/notifications/hooks";
import { notificationIcons, type AppNotification } from "@/features/notifications/types";
import { flattenPages } from "@/lib/infinite";
import { formatTimeAgo } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Where an alert leads: its lead, or a list that fits what it's about (same as the website). */
function open(notification: AppNotification) {
  if (notification.lead) return router.push({ pathname: "/leads/[id]", params: { id: notification.lead } });
  if (notification.type === "stale_leads") return router.navigate({ pathname: "/leads", params: { stale: "true" } });
  if (notification.type === "lead_expired") {
    return router.navigate({ pathname: "/leads", params: { assignedTo: "unassigned" } });
  }
  if (notification.type === "reassignment_requested") {
    return router.push("/handovers");
  }
  router.navigate("/follow-ups");
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const notifications = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationsRead();
  const { mutate: markAsRead } = markRead;
  const unreadCount = unread.data ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => <HeaderButton label="Mark all read" onPress={() => markAsRead(undefined)} disabled={markRead.isPending} />
          : undefined,
    });
  }, [navigation, unreadCount, markAsRead, markRead.isPending]);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationRow
        notification={item}
        onPress={() => {
          if (!item.readAt) markAsRead([item.id]);
          open(item);
        }}
      />
    ),
    [markAsRead],
  );

  return (
    <InfiniteList
      items={flattenPages(notifications.data)}
      renderItem={renderItem}
      keyExtractor={(n) => n.id}
      isPending={notifications.isPending}
      error={notifications.error}
      onRetry={() => void notifications.refetch()}
      onRefresh={() => Promise.all([notifications.refetch(), unread.refetch()])}
      hasNextPage={notifications.hasNextPage}
      isFetchingNextPage={notifications.isFetchingNextPage}
      fetchNextPage={() => void notifications.fetchNextPage()}
      empty={
        <EmptyView
          icon="notifications-outline"
          title="No alerts"
          message="New leads, mentions and due follow-ups show up here."
        />
      }
    />
  );
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const { colors } = useTheme();
  const unread = !notification.readAt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${notification.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: unread ? colors.primarySoft : colors.card,
          borderColor: unread ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name={notificationIcons[notification.type] ?? "notifications-outline"} size={18} color={colors.primary} />
      </View>
      <View style={styles.main}>
        <AppText weight={unread ? "600" : "400"}>{notification.title}</AppText>
        {notification.body ? (
          <AppText variant="small" muted numberOfLines={3}>
            {notification.body}
          </AppText>
        ) : null}
        <AppText variant="small" muted>
          {formatTimeAgo(notification.createdAt)}
        </AppText>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1, gap: 2 },
  dot: { width: 9, height: 9, borderRadius: radius.pill, marginTop: 6 },
});
