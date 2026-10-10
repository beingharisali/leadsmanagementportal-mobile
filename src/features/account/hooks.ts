import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { User } from "@/features/users/types";
import { apiClient } from "@/lib/api-client";
import { authKeys } from "@/lib/query-client";

/** Your own name and phone. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; phone: string }) => apiClient.patch<User>("/auth/me", payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** Changing it signs you out on every other device (this one stays signed in). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.post<null>("/auth/change-password", payload),
  });
}

/** Sends the email-confirmation link again (owners who signed up). */
export function useResendVerification() {
  return useMutation({ mutationFn: () => apiClient.post<null>("/auth/resend-verification") });
}
