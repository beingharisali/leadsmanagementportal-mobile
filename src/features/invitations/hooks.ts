import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AssignableRole } from "@/features/users/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/invitations). */
export interface Invitation {
  id: string;
  email: string;
  name?: string;
  role: AssignableRole;
  /** A team member's custom role ("General Team" for new invitations) */
  memberRole?: string | null;
  expiresAt: string;
  sentAt: string;
  invitedBy: { id: string; name: string } | null;
  createdAt: string;
}

export function isInvitationExpired(invitation: Pick<Invitation, "expiresAt">, now = Date.now()) {
  return new Date(invitation.expiresAt).getTime() <= now;
}

const invitationKeys = { all: ["invitations"] as const };

/** Invitations waiting to be accepted (owners and admins). */
export function useInvitations() {
  return useQuery({ queryKey: invitationKeys.all, queryFn: () => apiClient.get<Invitation[]>("/invitations") });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
}

export function useCreateInvitation() {
  const refresh = useRefresh();
  return useMutation({
    // Everyone invited joins as "General Team"; their role is changed on the Team screen.
    mutationFn: (payload: { email: string; name?: string }) =>
      apiClient.post<Invitation>("/invitations", payload),
    // A 502 means it was saved but the email didn't go out: it's in the list with "Resend".
    onSettled: refresh,
  });
}

export function useResendInvitation() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => apiClient.post<Invitation>(`/invitations/${id}/resend`), onSuccess: refresh });
}

export function useRevokeInvitation() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => apiClient.delete<null>(`/invitations/${id}`), onSuccess: refresh });
}
