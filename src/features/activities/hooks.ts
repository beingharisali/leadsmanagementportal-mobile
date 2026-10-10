import { useInfiniteQuery } from "@tanstack/react-query";

import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { Activity, ActivityAction } from "./types";

export interface ActivityListParams {
  entityType?: "lead" | "user";
  action?: ActivityAction;
  actor?: string;
  /** Hide sign-ins, sign-outs and lead opens */
  excludeTracking?: boolean;
}

/** The company's audit log (owners and admins, plans with the audit log). Refreshes every 15 s while open. */
export function useActivities(params: ActivityListParams) {
  return useInfiniteQuery({
    queryKey: ["activities", params],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<Activity>("/activities", { ...params, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Activity>) => nextPage(last),
    refetchInterval: 15_000,
  });
}
