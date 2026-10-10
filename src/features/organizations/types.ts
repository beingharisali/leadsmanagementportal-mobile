import type { PlanFeature, PlanKey, PlanLimits } from "@/features/plans/types";

/** Mirrors the API (server/src/modules/organizations). */
export const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export type OrganizationStatus = "active" | "suspended";
export type BillingStatus = "trial" | "paid";

/** The signed-in user's organization, as sent with `/auth/me`. */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  /** The package (Starter / Growth / Business): decides limits and features */
  plan: PlanKey;
  billingStatus: BillingStatus;
  trialEndsAt?: string;
  paidUntil?: string;
  limits: PlanLimits;
  features: PlanFeature[];
  /** Trial over or payment overdue: everyone can look, nobody can change anything */
  readOnly: boolean;
  readOnlyReason: string | null;
  /** Present when a logo is uploaded; `updatedAt` versions the image URL */
  logo: { updatedAt: string } | null;
  industry?: string;
  teamSize?: TeamSize;
  phone?: string;
  city?: string;
  /** The owner hasn't finished the setup wizard yet (new companies) */
  setupPending: boolean;
  /** Sample leads are loaded and can be deleted in one click */
  hasSampleData: boolean;
  /** The shared public demo: some actions are turned off and it resets nightly */
  isDemo?: boolean;
}
