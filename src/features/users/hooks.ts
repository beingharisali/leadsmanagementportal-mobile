import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, type Paginated } from "@/lib/api-client";
import { nextPage } from "@/lib/infinite";

import type { AssignableRole, User, UserRole, UserShift } from "./types";

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Active team members a lead can be given to. Managers only (the API refuses agents). */
export function useAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: ["users", "assignable"],
    queryFn: () => apiClient.get<AssignableUser[]>("/users/assignable"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// ---- Team management (owners and admins) ----

export interface UserListParams {
  search?: string;
  role?: UserRole;
  status?: "active" | "inactive";
}

export interface UserPayload {
  name: string;
  email: string;
  phone?: string;
  role?: AssignableRole;
  password?: string;
  isActive?: boolean;
  shift?: UserShift | null;
}

export interface OffboardingPreview {
  user: { id: string; name: string; isActive: boolean };
  openLeads: number;
  pendingFollowUps: number;
  pendingRequests: number;
}

export interface OffboardingResult {
  leadsMoved: number;
  followUpsMoved: number;
  requestsCancelled: number;
  reassignedTo: string | null;
}

export const userKeys = {
  all: ["users"] as const,
  list: (params: UserListParams) => [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
  offboarding: (id: string) => [...userKeys.all, "offboarding", id] as const,
};

export function useUsers(params: UserListParams) {
  return useInfiniteQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ pageParam }) => apiClient.getPaginated<User>("/users", { ...params, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<User>) => nextPage(last),
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => apiClient.get<User>(`/users/${id}`),
    enabled: !!id,
  });
}

/** Team changes touch lead owners and pickers too. */
function useRefreshTeam() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
  };
}

export function useCreateUser() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (payload: UserPayload & { password: string }) => apiClient.post<User>("/users", payload),
    onSuccess: refresh,
  });
}

export function useUpdateUser() {
  const refresh = useRefreshTeam();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UserPayload> }) =>
      apiClient.patch<User>(`/users/${id}`, payload),
    onSuccess: () => {
      refresh();
      // Editing yourself changes the profile shown around the app.
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useOffboardingPreview(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.offboarding(id ?? ""),
    queryFn: () => apiClient.get<OffboardingPreview>(`/users/${id}/offboarding`),
    enabled: !!id,
  });
}

/**
 * Hands the leaver's open leads and follow-ups over, then deactivates them.
 * With `remove`, the account is then deleted for good and its email freed.
 */
export function useOffboardUser() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: ({ id, reassignTo, remove = false }: { id: string; reassignTo: string | null; remove?: boolean }) =>
      apiClient.post<OffboardingResult>(`/users/${id}/${remove ? "delete" : "offboard"}`, { reassignTo }),
    onSuccess: refresh,
  });
}
