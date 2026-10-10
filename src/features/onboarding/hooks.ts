import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-provider";
import { isManagerRole } from "@/features/users/types";
import { apiClient } from "@/lib/api-client";

/** Owners and admins of a company that never loaded the sample leads. */
export function useCanLoadSampleData() {
  const user = useCurrentUser();
  return isManagerRole(user.role) && user.organization?.hasSampleData === false;
}

/** Fills the workspace with demo leads across the pipeline (deleted in one go later, from Settings). */
export function useLoadSampleData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ created: number }>("/onboarding/sample-data"),
    // Everything changes: leads, follow-ups, and the organization's `hasSampleData`.
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

/** Removes every sample lead (tagged "sample"); the company's own leads aren't touched. */
export function useDeleteSampleData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<{ deleted: number }>("/onboarding/sample-data"),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

/** Owner: marks the setup wizard finished (the dashboard stops asking). */
export function useCompleteSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>("/onboarding/complete"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}
