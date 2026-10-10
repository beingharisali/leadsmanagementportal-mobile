import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadKeys } from "@/features/leads/hooks";
import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/reassignments). */
export type ReassignmentStatus = "pending" | "approved" | "rejected" | "cancelled";

export const reassignmentStatusLabels: Record<ReassignmentStatus, string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Turned down",
  cancelled: "Cancelled",
};

export interface ReassignmentRequest {
  id: string;
  lead: { id: string; name: string; businessName: string; status: string; isDeleted: boolean } | null;
  requestedBy: UserSummary;
  /** Who the agent suggested; `null` = anyone */
  suggestedTo: UserSummary | null;
  reason: string;
  status: ReassignmentStatus;
  decidedBy?: { id: string; name: string };
  decidedAt?: string;
  decisionNote?: string;
  /** Who got the lead on approval (`null` = the unassigned pool) */
  assignedTo?: { id: string; name: string } | null;
  createdAt: string;
}

interface ListParams {
  status?: ReassignmentStatus;
  leadId?: string;
  limit?: number;
}

const reassignmentKeys = {
  all: ["reassignments"] as const,
  list: (params: ListParams) => [...reassignmentKeys.all, "list", params] as const,
  pendingCount: () => [...reassignmentKeys.all, "pending-count"] as const,
};

const reassignmentsApi = {
  list: (params: ListParams & { page: number }) =>
    apiClient.getPaginated<ReassignmentRequest>("/reassignment-requests", { ...params }),
  pendingCount: () => apiClient.get<{ pending: number }>("/reassignment-requests/pending-count"),
  create: (payload: { leadId: string; reason: string }) =>
    apiClient.post<ReassignmentRequest>("/reassignment-requests", payload),
  approve: (id: string, assigneeId: string | null) =>
    apiClient.post<ReassignmentRequest>(`/reassignment-requests/${id}/approve`, { assigneeId }),
  reject: (id: string, note?: string) =>
    apiClient.post<ReassignmentRequest>(`/reassignment-requests/${id}/reject`, { note }),
  cancel: (id: string) => apiClient.post<ReassignmentRequest>(`/reassignment-requests/${id}/cancel`),
};

/** Agents see their own requests; managers see everyone's. */
export function useReassignments(params: ListParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: reassignmentKeys.list(params),
    queryFn: ({ pageParam }) => reassignmentsApi.list({ limit: 25, ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<ReassignmentRequest>) => nextPage(last),
    enabled,
  });
}

/** Managers: requests waiting for an answer (badge on More). */
export function usePendingReassignmentCount(enabled: boolean) {
  return useQuery({
    queryKey: reassignmentKeys.pendingCount(),
    queryFn: reassignmentsApi.pendingCount,
    select: (data) => data.pending,
    refetchInterval: 60_000,
    enabled,
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: reassignmentKeys.all });
    void queryClient.invalidateQueries({ queryKey: leadKeys.all });
  };
}

export function useRequestReassignment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: reassignmentsApi.create, onSuccess: refresh });
}

export function useCancelReassignment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: reassignmentsApi.cancel, onSuccess: refresh });
}

export function useApproveReassignment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      reassignmentsApi.approve(id, assigneeId),
    onSuccess: refresh,
  });
}

export function useRejectReassignment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => reassignmentsApi.reject(id, note),
    onSuccess: refresh,
  });
}
