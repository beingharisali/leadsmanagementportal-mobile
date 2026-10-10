import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/comments). */
export interface LeadComment {
  id: string;
  lead: string;
  author: UserSummary;
  /** Mentions are `@[Name](userId)` tokens (see `mentions.ts`) */
  body: string;
  mentions: UserSummary[];
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentionableUser {
  id: string;
  name: string;
  role: "owner" | "admin" | "agent";
}

export const commentKeys = {
  list: (leadId: string) => ["comments", leadId] as const,
  mentionable: (leadId: string) => ["comments", leadId, "mentionable"] as const,
};

const commentsApi = {
  list: (leadId: string) => apiClient.get<LeadComment[]>(`/leads/${leadId}/comments`),
  mentionable: (leadId: string) => apiClient.get<MentionableUser[]>(`/leads/${leadId}/comments/mentionable`),
  create: (leadId: string, body: string) => apiClient.post<LeadComment>(`/leads/${leadId}/comments`, { body }),
  update: (leadId: string, id: string, body: string) =>
    apiClient.patch<LeadComment>(`/leads/${leadId}/comments/${id}`, { body }),
  remove: (leadId: string, id: string) => apiClient.delete<null>(`/leads/${leadId}/comments/${id}`),
};

/** A lead's team discussion; refreshes every minute while open, like the website. */
export function useComments(leadId: string) {
  return useQuery({
    queryKey: commentKeys.list(leadId),
    queryFn: () => commentsApi.list(leadId),
    refetchInterval: 60_000,
  });
}

/** People who can be @mentioned on this lead (fetched when the composer is used). */
export function useMentionable(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: commentKeys.mentionable(leadId),
    queryFn: () => commentsApi.mentionable(leadId),
    staleTime: 5 * 60_000,
    enabled,
  });
}

function useRefresh(leadId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: commentKeys.list(leadId) });
}

export function useCreateComment(leadId: string) {
  const refresh = useRefresh(leadId);
  return useMutation({ mutationFn: (body: string) => commentsApi.create(leadId, body), onSuccess: refresh });
}

export function useUpdateComment(leadId: string) {
  const refresh = useRefresh(leadId);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => commentsApi.update(leadId, id, body),
    onSuccess: refresh,
  });
}

export function useDeleteComment(leadId: string) {
  const refresh = useRefresh(leadId);
  return useMutation({ mutationFn: (id: string) => commentsApi.remove(leadId, id), onSuccess: refresh });
}
