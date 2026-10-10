import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Activity } from "@/features/activities/types";
import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { Lead, LeadListParams, LeadPayload, LeadRating } from "./types";

export const leadKeys = {
  all: ["leads"] as const,
  list: (params: LeadListParams) => [...leadKeys.all, "list", params] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
  activities: (id: string) => [...leadKeys.all, "activities", id] as const,
};

const PAGE_SIZE = 25;

export const leadsApi = {
  list: (params: LeadListParams & { page: number }) => apiClient.getPaginated<Lead>("/leads", { ...params }),
  get: (id: string) => apiClient.get<Lead>(`/leads/${id}`),
  create: (payload: LeadPayload & { assignedTo?: string | null }) => apiClient.post<Lead>("/leads", payload),
  update: (id: string, payload: Partial<LeadPayload>) => apiClient.patch<Lead>(`/leads/${id}`, payload),
  changeStatus: (id: string, payload: { status: string; lostReason?: string }) =>
    apiClient.patch<Lead>(`/leads/${id}/status`, payload),
  setRating: (id: string, rating: LeadRating | null) => apiClient.put<Lead>(`/leads/${id}/rating`, { rating }),
  activities: (id: string) => apiClient.get<Activity[]>(`/leads/${id}/activities`),
  addNote: (id: string, message: string) => apiClient.post<Activity>(`/leads/${id}/notes`, { message }),
  logMessage: (id: string, payload: { channel: "whatsapp" | "email"; body: string; subject?: string; templateName?: string }) =>
    apiClient.post<Activity>(`/leads/${id}/messages`, payload),
  recordView: (id: string) => apiClient.post<null>(`/leads/${id}/views`),
};

export function useLeads(params: LeadListParams) {
  return useInfiniteQuery({
    queryKey: leadKeys.list(params),
    queryFn: ({ pageParam }) => leadsApi.list({ limit: PAGE_SIZE, ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Lead>) => nextPage(last),
  });
}

export function useLead(id: string) {
  return useQuery({ queryKey: leadKeys.detail(id), queryFn: () => leadsApi.get(id) });
}

export function useLeadActivities(id: string) {
  return useQuery({ queryKey: leadKeys.activities(id), queryFn: () => leadsApi.activities(id) });
}

/**
 * After anything that changes a lead: the saved lead goes straight into its
 * screen; lists, history and follow-ups refresh in the background.
 */
export function useRefreshLead() {
  const queryClient = useQueryClient();
  return (lead?: Lead) => {
    if (lead) queryClient.setQueryData(leadKeys.detail(lead.id), lead);
    void queryClient.invalidateQueries({ queryKey: leadKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
  };
}

export function useCreateLead() {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: leadsApi.create, onSuccess: refresh });
}

export function useUpdateLead(id: string) {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: (payload: Partial<LeadPayload>) => leadsApi.update(id, payload), onSuccess: refresh });
}

export function useChangeLeadStatus(id: string) {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (payload: { status: string; lostReason?: string }) => leadsApi.changeStatus(id, payload),
    onSuccess: refresh,
  });
}

export function useSetLeadRating(id: string) {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: (rating: LeadRating | null) => leadsApi.setRating(id, rating), onSuccess: refresh });
}

export function useAddNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => leadsApi.addNote(id, message),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: leadKeys.activities(id) }),
  });
}

export function useLogMessage(id: string) {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (payload: { channel: "whatsapp" | "email"; body: string; subject?: string; templateName?: string }) =>
      leadsApi.logMessage(id, payload),
    onSuccess: () => refresh(),
  });
}

/** Managers: give the lead to someone, or `null` to put it back in the unassigned pool. */
export function useAssignLead(id: string) {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (assigneeId: string | null) =>
      apiClient.post<{ updated: number; skipped: number; notFound: number }>("/leads/assign", {
        leadIds: [id],
        assigneeId,
      }),
    onSuccess: () => refresh(),
  });
}

export interface LeadStats {
  total: number;
  createdThisMonth: number;
  /** Managers only (0 for agents) */
  unassigned: number;
  openCount: number;
  openBudget: number;
  wonCount: number;
  wonBudget: number;
  winRate: number;
  byStatus: { status: string; count: number; budget: number }[];
  bySource: { source: string; count: number }[];
  /** Open leads per rating */
  byRating: Record<LeadRating, number>;
}

/** Counts and value per stage (agents: their own leads). */
export function useLeadStats() {
  return useQuery({ queryKey: [...leadKeys.all, "stats"], queryFn: () => apiClient.get<LeadStats>("/leads/stats") });
}
