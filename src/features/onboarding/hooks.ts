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
