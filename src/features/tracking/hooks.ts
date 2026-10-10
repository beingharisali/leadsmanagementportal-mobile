import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { AgentDay, Attendance, PresenceBoard, Session, Timesheet } from "./types";

/** Team monitoring (owners and admins, plans with monitoring). */
export const trackingKeys = {
  all: ["tracking"] as const,
  presence: () => [...trackingKeys.all, "presence"] as const,
  day: (userId: string, date?: string) => [...trackingKeys.all, "day", userId, date] as const,
  timesheet: (params: object) => [...trackingKeys.all, "timesheet", params] as const,
  sessions: (userId?: string) => [...trackingKeys.all, "sessions", userId] as const,
  attendance: (params: object) => [...trackingKeys.all, "attendance", params] as const,
};

/** Who's online, idle or offline, and on which lead; refreshes every 15 seconds. */
export function usePresence() {
  return useQuery({
    queryKey: trackingKeys.presence(),
    queryFn: () => apiClient.get<PresenceBoard>("/tracking/presence"),
    refetchInterval: 15_000,
  });
}

/** One person's day. Today refreshes every minute; past days don't change. */
export function useAgentDay(userId: string, date: string | undefined, isToday: boolean) {
  return useQuery({
    queryKey: trackingKeys.day(userId, date),
    queryFn: () => apiClient.get<AgentDay>(`/tracking/users/${userId}/day`, { date }),
    placeholderData: keepPreviousData,
    refetchInterval: isToday ? 60_000 : false,
  });
}

/** Hours per person per day; `from`/`to` are "YYYY-MM-DD" (at most 62 days). */
export function useTimesheet(params: { from: string; to: string; user?: string }) {
  return useQuery({
    queryKey: trackingKeys.timesheet(params),
    queryFn: () => apiClient.get<Timesheet>("/tracking/timesheet", params),
    placeholderData: keepPreviousData,
  });
}

/** A month of present / late / absent per person ("YYYY-MM"). */
export function useAttendance(params: { month: string; user?: string }) {
  return useQuery({
    queryKey: trackingKeys.attendance(params),
    queryFn: () => apiClient.get<Attendance>("/tracking/attendance", params),
    placeholderData: keepPreviousData,
  });
}

/** Login history, newest first. */
export function useSessions(userId?: string) {
  return useInfiniteQuery({
    queryKey: trackingKeys.sessions(userId),
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<Session>("/tracking/sessions", { page: pageParam, limit: 20, user: userId }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Session>) => nextPage(last),
  });
}
