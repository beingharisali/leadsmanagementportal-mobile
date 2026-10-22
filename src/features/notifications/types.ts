import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/notifications/notification.constants.ts). Keep in sync. */
export type NotificationType =
  | "mention"
  | "comment"
  | "lead_assigned"
  | "follow_up_due"
  | "follow_up_assigned"
  | "stale_leads"
  | "lead_expired"
  | "reassignment_requested"
  | "reassignment_decided"
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_comment"
  | "task_mention"
  | "task_submitted"
  | "task_approved"
  | "task_rejected"
  | "task_completed"
  | "project_added"
  | "check_in_late"
  | "check_in_missing";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  actor?: UserSummary;
  /** Lead id; the notification opens it */
  lead?: string;
  /** Task or project id; the notification opens it */
  task?: string;
  project?: string;
  readAt?: string;
  createdAt: string;
}

export const notificationIcons: Record<NotificationType, ComponentProps<typeof Ionicons>["name"]> = {
  mention: "at",
  comment: "chatbubble-outline",
  lead_assigned: "person-add-outline",
  follow_up_due: "alarm-outline",
  follow_up_assigned: "alarm-outline",
  stale_leads: "hourglass-outline",
  lead_expired: "return-down-back-outline",
  reassignment_requested: "swap-horizontal-outline",
  reassignment_decided: "swap-horizontal-outline",
  task_assigned: "clipboard-outline",
  task_due_soon: "alarm-outline",
  task_overdue: "hourglass-outline",
  task_comment: "chatbubble-outline",
  task_mention: "at",
  task_submitted: "send-outline",
  task_approved: "thumbs-up-outline",
  task_rejected: "thumbs-down-outline",
  task_completed: "checkmark-circle-outline",
  project_added: "folder-open-outline",
  check_in_late: "alarm-outline",
  check_in_missing: "person-remove-outline",
};
