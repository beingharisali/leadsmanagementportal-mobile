import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import type { PlanSummary } from "./types";

/** The company's plan, its usage against the limits, and every plan to compare. */
export function usePlanSummary() {
  return useQuery({ queryKey: ["plan"], queryFn: () => apiClient.get<PlanSummary>("/plan") });
}
