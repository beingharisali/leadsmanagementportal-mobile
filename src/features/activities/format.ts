import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

import type { LeadOptions } from "@/features/customization/hooks";
import { leadRatingLabels, leadTimelineLabels } from "@/features/leads/config";
import type { LeadRating, LeadTimeline } from "@/features/leads/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

import type { ActivityAction } from "./types";

/** Mirrors the website (client/features/activities/format.ts). */
export const actionLabels: Record<ActivityAction, string> = {
  created: "Created",
  updated: "Updated",
  assigned: "Assigned",
  unassigned: "Unassigned",
  status_changed: "Status changed",
  note_added: "Note added",
  deleted: "Moved to recycle bin",
  restored: "Restored",
  activated: "Activated",
  deactivated: "Deactivated",
  signed_in: "Signed in",
  signed_out: "Signed out",
  viewed: "Opened",
  follow_up_set: "Follow-up scheduled",
  follow_up_done: "Follow-up done",
  follow_up_cancelled: "Follow-up cancelled",
  message_sent: "Sent a message",
  call_logged: "Logged a call",
  rating_changed: "Changed the rating",
  attachment_added: "Attached a file",
  attachment_removed: "Removed a file",
  support_access: "Heapware support signed in",
};

type IconName = ComponentProps<typeof Ionicons>["name"];

export const actionIcons: Record<ActivityAction, IconName> = {
  created: "add",
  updated: "pencil",
  assigned: "person-add-outline",
  unassigned: "person-remove-outline",
  status_changed: "swap-horizontal",
  note_added: "document-text-outline",
  deleted: "trash-outline",
  restored: "refresh",
  activated: "person-add-outline",
  deactivated: "person-remove-outline",
  signed_in: "log-in-outline",
  signed_out: "log-out-outline",
  viewed: "eye-outline",
  follow_up_set: "alarm-outline",
  follow_up_done: "checkmark-done",
  follow_up_cancelled: "close-circle-outline",
  message_sent: "chatbubble-ellipses-outline",
  call_logged: "call-outline",
  rating_changed: "flame-outline",
  attachment_added: "attach",
  attachment_removed: "attach",
  support_access: "help-buoy-outline",
};

/** Actions whose message is the content itself (shown in a box), not a side note. */
export const CONTENT_ACTIONS: ActivityAction[] = ["note_added", "message_sent", "call_logged", "follow_up_done"];

const fieldLabels: Record<string, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  businessName: "Business",
  businessType: "Business type",
  city: "City",
  address: "Address",
  source: "Source",
  sourceDetail: "Source detail",
  requirement: "Requirement",
  budget: "Budget",
  timeline: "Timeline",
  tags: "Tags",
  status: "Status",
  lostReason: "Lost reason",
  followUpAt: "Follow-up",
  followUpNote: "Follow-up note",
  followUpType: "Type",
  followUpLocation: "Where",
  rating: "Rating",
  assignedTo: "Assigned to",
};

const CUSTOM_FIELD_PREFIX = "customFields.";

type Lookups = Pick<LeadOptions, "stageLabel" | "sourceLabel" | "customField">;

export function formatFieldLabel(field: string, lookups: Lookups) {
  if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
    const key = field.slice(CUSTOM_FIELD_PREFIX.length);
    return lookups.customField(key)?.label ?? key.replace(/_/g, " ");
  }
  return fieldLabels[field] ?? field;
}

/** A stored change value (`from` / `to`) as readable text. */
export function formatChangeValue(field: string, value: unknown, lookups: Lookups): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  }
  switch (field) {
    case "status":
      return lookups.stageLabel(String(value));
    case "source":
      return lookups.sourceLabel(String(value));
    case "timeline":
      return leadTimelineLabels[value as LeadTimeline] ?? String(value);
    case "budget":
      return typeof value === "number" ? formatCurrency(value) : String(value);
    case "followUpAt":
      return typeof value === "string" ? formatDateTime(value) : String(value);
    case "rating":
      return leadRatingLabels[value as LeadRating] ?? String(value);
  }
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object" && "name" in value) return String((value as { name: unknown }).name);
  return String(value);
}
