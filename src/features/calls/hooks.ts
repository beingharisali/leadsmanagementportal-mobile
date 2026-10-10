import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRefreshLead } from "@/features/leads/hooks";
import { apiClient } from "@/lib/api-client";

import type { CallLogPayload } from "./types";

export const callsApi = {
  log: (payload: CallLogPayload & { leadId: string }) => apiClient.post<{ id: string }>("/calls", payload),
};

/** A call changes the lead's history, score and "last contacted". */
export function useLogCall() {
  const refresh = useRefreshLead();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callsApi.log,
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export interface CallSummary {
  total: number;
  /** Calls that reached the lead */
  reached: number;
  durationSeconds: number;
}

/** The signed-in user's calls between two moments (e.g. their local day). */
export function useCallSummary(params: { from: string; to: string }) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => apiClient.get<CallSummary>("/calls/summary", params),
  });
}
