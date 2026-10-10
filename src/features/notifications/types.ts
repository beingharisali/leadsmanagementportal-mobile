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
  | "reassignment_decided";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  actor?: UserSummary;
  /** Lead id; the notification opens it */
  lead?: string;
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
};
