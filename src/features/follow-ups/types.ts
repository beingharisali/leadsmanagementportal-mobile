import type { Lead } from "@/features/leads/types";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/follow-ups/follow-up.constants.ts). Keep in sync. */
export const FOLLOW_UP_TYPES = ["call", "meeting", "message"] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export type FollowUpStatus = "pending" | "done" | "cancelled";

/** Tabs of the Follow-ups screen. */
export const FOLLOW_UP_VIEWS = ["overdue", "today", "upcoming", "done"] as const;
export type FollowUpView = (typeof FOLLOW_UP_VIEWS)[number];

export type FollowUpLead = Pick<
  Lead,
  "id" | "name" | "businessName" | "phone" | "email" | "city" | "status" | "rating" | "score"
>;

export interface FollowUp {
  id: string;
  lead: FollowUpLead;
  assignedTo: UserSummary | null;
  type: FollowUpType;
  dueAt: string;
  note?: string;
  /** Meetings only */
  location?: string;
  status: FollowUpStatus;
  outcome?: string;
  completedAt?: string;
  completedBy?: UserSummary;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpListParams {
  limit?: number;
  leadId?: string;
  status?: FollowUpStatus | "all";
  type?: FollowUpType;
  /** ISO date-times: due at or after / at or before */
  from?: string;
  until?: string;
  overdue?: boolean;
  /** Managers only: "all" includes every agent's follow-ups */
  scope?: "mine" | "all";
  /** Managers only, with scope "all": one agent's */
  assignedTo?: string;
  sort?: "dueAt" | "-dueAt" | "-completedAt";
}

export interface FollowUpPayload {
  type: FollowUpType;
  dueAt: string;
  note?: string;
  location?: string;
}

export interface FollowUpSummary {
  overdue: number;
  /** Still due later today */
  dueToday: number;
  upcoming: number;
  doneToday: number;
  /** Managers asking with `team` only: who has overdue / due-today follow-ups */
  team: TeamFollowUpRow[] | null;
  teamOverdue?: number;
  teamDueToday?: number;
}

export interface TeamFollowUpRow {
  /** `null`: unassigned leads */
  user: { id: string; name: string; isActive: boolean } | null;
  overdue: number;
  dueToday: number;
  oldestDueAt: string;
}
