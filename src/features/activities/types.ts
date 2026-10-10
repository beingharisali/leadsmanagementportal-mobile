import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/activities). */
export type ActivityAction =
  | "created"
  | "updated"
  | "assigned"
  | "unassigned"
  | "status_changed"
  | "note_added"
  | "deleted"
  | "restored"
  | "activated"
  | "deactivated"
  | "signed_in"
  | "signed_out"
  | "viewed"
  | "follow_up_set"
  | "follow_up_done"
  | "follow_up_cancelled"
  | "message_sent"
  | "call_logged"
  | "rating_changed"
  | "attachment_added"
  | "attachment_removed"
  | "support_access";

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface Activity {
  id: string;
  entityType: "lead" | "user";
  entityId: string;
  entityLabel: string;
  action: ActivityAction;
  actor: UserSummary;
  changes: FieldChange[];
  message?: string;
  createdAt: string;
}
