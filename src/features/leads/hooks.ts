import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Activity } from "@/features/activities/types";
import { apiClient, getErrorMessage, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { ImportLeadRow, ImportResult } from "./import";
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

// ---- Duplicates, tags, recycle bin, views, bulk assign ----

export interface DuplicateLead {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  email: string | null;
  status: string;
  assignedTo: { id: string; name: string } | null;
}

/** Leads that already have this phone or email (checked while typing in the lead form). */
export function useDuplicateCheck(params: { phone: string; email: string; excludeId?: string }) {
  const digits = params.phone.replace(/\D/g, "");
  const phone = digits.length >= 7 ? params.phone : undefined;
  const email = params.email.includes("@") ? params.email : undefined;
  return useQuery({
    queryKey: [...leadKeys.all, "duplicates", { phone, email, excludeId: params.excludeId }],
    queryFn: () => apiClient.get<DuplicateLead[]>("/leads/duplicates", { phone, email, excludeId: params.excludeId }),
    enabled: !!phone || !!email,
    staleTime: 10_000,
  });
}

/** Every tag used on the company's leads, for suggestions. */
export function useLeadTags() {
  return useQuery({
    queryKey: [...leadKeys.all, "tags"],
    queryFn: () => apiClient.get<string[]>("/leads/tags"),
    staleTime: 60_000,
  });
}

/** Managers: deleted leads, newest first. */
export function useTrash(search: string) {
  return useInfiniteQuery({
    queryKey: [...leadKeys.all, "trash", search],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<Lead>("/leads/trash", { page: pageParam, limit: 25, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Lead>) => nextPage(last),
  });
}

/** Managers: move a lead to the recycle bin. */
export function useDeleteLead() {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: (id: string) => apiClient.delete<null>(`/leads/${id}`), onSuccess: () => refresh() });
}

/** Managers: move several leads to the recycle bin at once. */
/** Moves every lead in one pipeline stage (narrowed by the pipeline's filters) to the recycle bin. */
export function useDeleteLeadsByStatus() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (body: { status: string; assignedTo?: string; assignedFrom?: string; assignedUntil?: string }) =>
      apiClient.post<{ deleted: number }>("/leads/delete-by-status", body),
    onSuccess: () => refresh(),
  });
}

export function useBulkDeleteLeads() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (leadIds: string[]) =>
      apiClient.post<{ deleted: number; notFound: number }>("/leads/bulk-delete", { leadIds }),
    onSuccess: () => refresh(),
  });
}

export function useRestoreLead() {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: (id: string) => apiClient.post<Lead>(`/leads/${id}/restore`), onSuccess: () => refresh() });
}

/** Managers: delete a lead in the recycle bin for good, with its history. */
export function usePurgeLead() {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: (id: string) => apiClient.delete<null>(`/leads/${id}/permanent`), onSuccess: () => refresh() });
}

/** Managers: restore several leads; ones that clash with an existing lead or the plan limit come back in `failed`. */
export function useBulkRestoreLeads() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (leadIds: string[]) =>
      apiClient.post<{
        restored: number;
        failed: { id: string; businessName: string; reason: string }[];
        notFound: number;
      }>("/leads/trash/restore", { leadIds }),
    onSuccess: () => refresh(),
  });
}

/** Managers: delete several leads in the recycle bin for good. */
export function useBulkPurgeLeads() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (leadIds: string[]) =>
      apiClient.post<{ deleted: number; notFound: number }>("/leads/trash/delete", { leadIds }),
    onSuccess: () => refresh(),
  });
}

/** Managers: delete every lead in the recycle bin for good. */
export function useEmptyTrash() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: () => apiClient.delete<{ deleted: number }>("/leads/trash"),
    onSuccess: () => refresh(),
  });
}

export interface LeadViews {
  views: Activity[];
  timeByUser: { user: { id: string; name: string }; activeMs: number; idleMs: number; lastAt: string }[];
}

/** Managers: who opened the lead and how long each person worked on it. */
export function useLeadViews(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...leadKeys.detail(id), "views"],
    queryFn: () => apiClient.get<LeadViews>(`/leads/${id}/views`),
    enabled,
  });
}

/** Managers: give several leads to one person (or nobody). */
export function useBulkAssign() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: (payload: { leadIds: string[]; assigneeId: string | null }) =>
      apiClient.post<{ updated: number; skipped: number; notFound: number }>("/leads/assign", payload),
    onSuccess: () => refresh(),
  });
}

/** Rows per request; the API takes at most 200. Same as the website. */
const IMPORT_BATCH_SIZE = 100;

/**
 * Managers: sends spreadsheet rows in batches, reporting progress (0–1).
 * If a batch fails, the rest are reported as "failed" so they can be retried.
 */
export function useImportLeads() {
  const refresh = useRefreshLead();
  return useMutation({
    mutationFn: async ({ rows, onProgress }: { rows: ImportLeadRow[]; onProgress?: (done: number) => void }) => {
      const total: ImportResult = { created: 0, duplicates: 0, invalid: 0, failed: 0, results: [] };
      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        try {
          const result = await apiClient.post<ImportResult>("/leads/import", { rows: rows.slice(i, i + IMPORT_BATCH_SIZE) });
          total.created += result.created;
          total.duplicates += result.duplicates;
          total.invalid += result.invalid;
          total.results.push(...result.results);
        } catch (error) {
          const message = `Not imported: ${getErrorMessage(error)}`;
          const remaining = rows.slice(i);
          total.failed = remaining.length;
          total.results.push(...remaining.map((r) => ({ row: r.row, status: "failed" as const, message })));
          break;
        }
        onProgress?.(Math.min(i + IMPORT_BATCH_SIZE, rows.length) / rows.length);
      }
      return total;
    },
    onSettled: () => refresh(),
  });
}
