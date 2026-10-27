import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { MIN_SEARCH_LENGTH, type PlatformSearchResults, type WorkspaceSearchResults } from "./types";

export const searchKeys = {
  all: ["search"] as const,
  workspace: (q: string) => [...searchKeys.all, "workspace", q] as const,
  platform: (q: string) => [...searchKeys.all, "platform", q] as const,
};

const options = (q: string, enabled: boolean) => ({
  enabled: enabled && q.length >= MIN_SEARCH_LENGTH,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
});

/** Leads, team members, tasks, projects and departments matching `q`. */
export function useWorkspaceSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: searchKeys.workspace(query),
    queryFn: () => apiClient.get<WorkspaceSearchResults>("/search", { q: query }),
    ...options(query, true),
  });
}

/** Companies, invoices and payments matching `q`; only for Heapware staff. */
export function usePlatformSearch(q: string, enabled: boolean) {
  const query = q.trim();
  return useQuery({
    queryKey: searchKeys.platform(query),
    queryFn: () => apiClient.get<PlatformSearchResults>("/platform/search", { q: query }),
    ...options(query, enabled),
  });
}
