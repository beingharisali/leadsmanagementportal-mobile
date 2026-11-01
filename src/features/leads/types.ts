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
  /** The spreadsheet it was imported from; none for leads added by hand or imported before files were recorded */
  upload?: { id: string; fileName: string; createdAt: string } | null;
  isSample: boolean;
  /** In the recycle bin */
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export const LEAD_SORTS = ["-createdAt", "-updatedAt", "-assignedAt", "-score", "name"] as const;
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
  /** Assigned on or after this day, "YYYY-MM-DD" in the company's time zone */
  assignedFrom?: string;
  /** Assigned on or before this day, "YYYY-MM-DD" in the company's time zone */
  assignedUntil?: string;
  /** Any of these cities (case doesn't matter) */
  city?: string[];
  /** One uploaded spreadsheet's id */
  upload?: string;
  /** From a file uploaded on or after this day, "YYYY-MM-DD" in the company's time zone */
  uploadedFrom?: string;
  /** From a file uploaded on or before this day */
  uploadedUntil?: string;
  sort?: LeadSort;
}

/** The city and uploaded-file filters, also sent with the pipeline's whole-stage actions. */
export type CityUploadParams = Pick<LeadListParams, "city" | "upload" | "uploadedFrom" | "uploadedUntil">;

/** A city on the leads, with how many leads have it. */
export interface LeadCity {
  name: string;
  count: number;
}

/** One row of the upload history (owners and admins). */
export interface UploadHistoryItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: { id: string; name: string } | null;
  rowCount: number;
  /** Leads the file created */
  createdCount: number;
  /** Its leads not in the recycle bin right now */
  activeCount: number;
  /** Its leads a revert put in the recycle bin, which Undo revert would bring back */
  inBin: number;
  /** Oldest first */
  reverts: {
    at: string;
    by: { id: string; name: string } | null;
    count: number;
    undoneAt: string | null;
    undoneBy: { id: string; name: string } | null;
  }[];
}

export interface UndoRevertResult {
  restored: number;
  failed: { id: string; businessName: string; reason: string }[];
  /** Restored or deleted for good before the undo */
  gone: number;
}

/** A spreadsheet imported into the leads list. */
export interface LeadUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: { id: string; name: string } | null;
  rowCount: number;
  /** Leads from it the user can see (not in the recycle bin) */
  leadCount: number;
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
