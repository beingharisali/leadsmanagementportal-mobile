/** Mirrors the API (server/src/modules/plans/plan.constants.ts). Keep in sync. */
export const PLAN_KEYS = ["starter", "growth", "business"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_FEATURES = ["import", "customFields", "templates", "monitoring", "auditLog"] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export type PlanLimit = "users" | "leads" | "storageBytes";
export type PlanLimits = Record<PlanLimit, number>;

export const planLabels: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
};
