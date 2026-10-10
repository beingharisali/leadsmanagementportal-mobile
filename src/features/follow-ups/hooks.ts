import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CallLogPayload } from "@/features/calls/types";
import { leadKeys } from "@/features/leads/hooks";
import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { FollowUp, FollowUpListParams, FollowUpPayload, FollowUpSummary } from "./types";

export const followUpKeys = {
  all: ["follow-ups"] as const,
  list: (params: FollowUpListParams) => [...followUpKeys.all, "list", params] as const,
  summary: (params: object) => [...followUpKeys.all, "summary", params] as const,
};

export const followUpsApi = {
  list: (params: FollowUpListParams & { page: number }) =>
    apiClient.getPaginated<FollowUp>("/follow-ups", { ...params }),
  summary: (params: { dayStart: string; dayEnd: string; team?: boolean }) =>
    apiClient.get<FollowUpSummary>("/follow-ups/summary", params),
  create: (payload: FollowUpPayload & { leadId: string }) => apiClient.post<FollowUp>("/follow-ups", payload),
  update: (id: string, payload: Partial<FollowUpPayload>) => apiClient.patch<FollowUp>(`/follow-ups/${id}`, payload),
  complete: (id: string, payload: { outcome?: string; call?: CallLogPayload }) =>
    apiClient.post<FollowUp>(`/follow-ups/${id}/complete`, payload),
  cancel: (id: string) => apiClient.post<FollowUp>(`/follow-ups/${id}/cancel`),
};

export function useFollowUps(params: FollowUpListParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: followUpKeys.list(params),
    queryFn: ({ pageParam }) => followUpsApi.list({ limit: 25, ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<FollowUp>) => nextPage(last),
    enabled,
  });
}

export function useFollowUpSummary(params: { dayStart: string; dayEnd: string; team?: boolean }) {
  return useQuery({ queryKey: followUpKeys.summary(params), queryFn: () => followUpsApi.summary(params) });
}

/** Follow-ups change a lead's history and "last contacted": refresh both. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: followUpKeys.all });
    void queryClient.invalidateQueries({ queryKey: leadKeys.all });
  };
}

export function useCreateFollowUp() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: followUpsApi.create, onSuccess: refresh });
}

export function useUpdateFollowUp() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FollowUpPayload> }) => followUpsApi.update(id, payload),
    onSuccess: refresh,
  });
}

export function useCompleteFollowUp() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { outcome?: string; call?: CallLogPayload } }) =>
      followUpsApi.complete(id, payload),
    onSuccess: refresh,
  });
}

export function useCancelFollowUp() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: followUpsApi.cancel, onSuccess: refresh });
}
