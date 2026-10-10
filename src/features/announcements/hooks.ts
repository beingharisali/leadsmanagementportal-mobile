import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/announcements). */
export type AnnouncementLevel = "info" | "success" | "warning";

export interface AnnouncementNotice {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  startsAt: string;
}

const announcementKeys = { mine: ["announcements"] as const };

/** Messages from Heapware for this user, until they close them. */
export function useMyAnnouncements(enabled: boolean) {
  return useQuery({
    queryKey: announcementKeys.mine,
    queryFn: () => apiClient.get<AnnouncementNotice[]>("/announcements"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useDismissAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<null>(`/announcements/${id}/dismiss`),
    // Hide it at once; the server remembers.
    onMutate: (id) =>
      queryClient.setQueryData<AnnouncementNotice[]>(announcementKeys.mine, (list) => list?.filter((a) => a.id !== id)),
  });
}
