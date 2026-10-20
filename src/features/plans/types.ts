/** Mirrors the API (server/src/modules/plans/plan.constants.ts). Keep in sync. */
export const PLAN_KEYS = ["starter", "growth", "business"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_FEATURES = [
  "import",
  "customFields",
  "templates",
  "monitoring",
  "auditLog",
  "teamWorkspace",
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** Features Heapware grants per company (not part of any plan by default). */
export const PLATFORM_GRANTED_FEATURES: PlanFeature[] = ["teamWorkspace"];

export type PlanLimit = "users" | "leads" | "storageBytes";
export type PlanLimits = Record<PlanLimit, number>;

export const planLabels: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
};

export const planFeatureLabels: Record<PlanFeature, string> = {
  import: "Import leads from Excel / CSV",
  customFields: "Custom lead fields",
  templates: "WhatsApp & email templates",
  monitoring: "Live status, timesheets and view as agent",
  auditLog: "Activity feed",
  teamWorkspace: "Team Workspace (departments, roles & permissions)",
};

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  description: string;
  limits: PlanLimits;
  features: PlanFeature[];
}

/** `GET /plan`: the company's plan, what it uses, and every plan to compare. */
export interface PlanSummary {
  plan: PlanKey;
  billingStatus: "trial" | "paid";
  trialEndsAt: string | null;
  paidUntil: string | null;
  readOnly: boolean;
  readOnlyReason: string | null;
  limits: PlanLimits;
  features: PlanFeature[];
  usage: {
    /** Active users plus open invitations */
    users: number;
    activeUsers: number;
    pendingInvitations: number;
    leads: number;
    storageBytes: number;
  };
  plans: PlanDefinition[];
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${+(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${+(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
