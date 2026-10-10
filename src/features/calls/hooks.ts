import { useMutation } from "@tanstack/react-query";

import { useRefreshLead } from "@/features/leads/hooks";
import { apiClient } from "@/lib/api-client";

import type { CallLogPayload } from "./types";

export const callsApi = {
  log: (payload: CallLogPayload & { leadId: string }) => apiClient.post<{ id: string }>("/calls", payload),
};

/** A call changes the lead's history, score and "last contacted". */
export function useLogCall() {
  const refresh = useRefreshLead();
  return useMutation({ mutationFn: callsApi.log, onSuccess: () => refresh() });
}
