import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { AppNotification } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
};

/** New alerts show on the tab within this long while the app is open. */
const POLL_MS = 60_000;

export const notificationsApi = {
  list: (page: number) => apiClient.getPaginated<AppNotification>("/notifications", { page, limit: 30 }),
  unreadCount: () => apiClient.get<{ unread: number }>("/notifications/unread-count"),
  /** Mark some (or, without ids, all) as read. */
  markRead: (ids?: string[]) => apiClient.post<{ updated: number }>("/notifications/read", ids ? { ids } : {}),
};

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<AppNotification>) => nextPage(last),
  });
}

/** For the badge on the Alerts tab. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationsApi.unreadCount,
    select: (data) => data.unread,
    refetchInterval: POLL_MS,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
