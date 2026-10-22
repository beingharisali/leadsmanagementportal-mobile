import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-provider";
import { apiClient } from "@/lib/api-client";

import type { PlanFeature, PlanSummary } from "./types";

/**
 * Whether the company can use a feature now (the API sends what it can use:
 * its plan's features, without paid-only ones during a trial or overdue payment).
 */
export function useHasFeature(feature: PlanFeature) {
  const features = useCurrentUser().organization?.features;
  return !features || features.includes(feature);
}

/** The company's plan, its usage against the limits, and every plan to compare. */
export function usePlanSummary() {
  return useQuery({ queryKey: ["plan"], queryFn: () => apiClient.get<PlanSummary>("/plan") });
}
