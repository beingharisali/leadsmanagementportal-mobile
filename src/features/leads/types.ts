import type { CustomFieldValue } from "@/features/customization/types";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/leads/lead.constants.ts). Keep in sync. */
export const LEAD_TIMELINES = [
  "immediately",
  "within_1_month",
  "1_3_months",
  "3_6_months",
  "6_plus_months",
  "not_sure",
] as const;
export type LeadTimeline = (typeof LEAD_TIMELINES)[number];

export const LEAD_RATINGS = ["hot", "warm", "cold"] as const;
export type LeadRating = (typeof LEAD_RATINGS)[number];

/** Stages and sources are per organization, so leads carry their keys (labels: `useLeadOptions()`). */
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  businessType?: string;
  city?: string;
  address?: string;
  source: string;
  sourceDetail?: string;
  requirement: string;
  budget?: number;
  timeline?: LeadTimeline;
  tags: string[];
  customFields?: Record<string, CustomFieldValue>;
  status: string;
  lostReason?: string;
  statusChangedAt?: string;
  /** Last call that connected, message or completed follow-up */
  lastContactedAt?: string;
  /** 0–100 */
  score: number;
  rating: LeadRating;
  ratingManual: boolean;
  assignedTo: UserSummary | null;
  assignedAt?: string;
  createdBy: UserSummary;
  isSample: boolean;
  /** In the recycle bin */
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export const LEAD_SORTS = ["-createdAt", "-updatedAt", "-score", "name"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export interface LeadListParams {
  limit?: number;
  search?: string;
  status?: string[];
  source?: string[];
  tag?: string;
  rating?: LeadRating[];
  /** Managers only: a user id, "me" or "unassigned" */
  assignedTo?: string;
  /** Only open leads nobody has contacted for the company's "stale after" days */
  stale?: boolean;
  sort?: LeadSort;
}

/** What the lead form sends (`POST /leads`, `PATCH /leads/:id`). */
export interface LeadPayload {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  businessType: string;
  city: string;
  address: string;
  source: string;
  sourceDetail: string;
  requirement: string;
  budget: number | null;
  timeline: LeadTimeline | null;
  tags?: string[];
  customFields: Record<string, CustomFieldValue | null>;
}
