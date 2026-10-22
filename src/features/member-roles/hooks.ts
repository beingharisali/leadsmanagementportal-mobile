import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { userRoleLabels, type User } from "@/features/users/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/member-roles) and the website. */
export interface MemberRole {
  id: string;
  name: string;
  /** "General Team": invitees join with it; it can't be renamed or deleted */
  isDefault: boolean;
  /** How many people have it */
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export const memberRoleKeys = { all: ["member-roles"] as const };

/** The company's custom roles, "General Team" first. */
export function useMemberRoles(enabled = true) {
  return useQuery({
    queryKey: memberRoleKeys.all,
    queryFn: () => apiClient.get<MemberRole[]>("/member-roles"),
    enabled,
    staleTime: 60_000,
  });
}

/** Roles and the people on them change together (counts, labels). */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: memberRoleKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateMemberRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<MemberRole>("/member-roles", { name }),
    onSuccess: refresh,
  });
}

export function useRenameMemberRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.patch<MemberRole>(`/member-roles/${id}`, { name }),
    onSuccess: refresh,
  });
}

export function useDeleteMemberRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ id: string; movedTo: MemberRole; membersMoved: number }>(`/member-roles/${id}`),
    onSuccess: refresh,
  });
}

/** A person's role as shown: "Owner", "Admin", "Agent", or their custom role ("Developer"). */
export function useRoleLabel() {
  const roles = useMemberRoles().data;
  return (user: Pick<User, "role" | "memberRole">) => {
    if (user.role !== "member") return userRoleLabels[user.role];
    return roles?.find((r) => r.id === user.memberRole)?.name ?? userRoleLabels.member;
  };
}
