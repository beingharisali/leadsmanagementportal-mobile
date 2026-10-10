import type Ionicons from "@expo/vector-icons/Ionicons";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";

import type { PlanFeature } from "@/features/plans/types";
import { MANAGER_ROLES, type User, type UserRole } from "@/features/users/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface MoreItem {
  /** Also the screen title */
  title: string;
  subtitle?: string;
  icon: IconName;
  /** Omit to show to every role */
  roles?: UserRole[];
  /** Part of a plan feature: shown with a lock on plans without it */
  feature?: PlanFeature;
  /** Heapware staff only */
  platformAdmin?: boolean;
  /** The screen it opens; items without one show "coming soon" */
  href?: Href;
}

export interface MoreSection {
  label: string;
  items: MoreItem[];
}

/**
 * The "More" tab: everything that isn't one of the main tabs, mirroring the
 * website's sidebar (client/config/navigation.ts). Items without an `href` arrive in later updates.
 */
const MORE_SECTIONS: MoreSection[] = [
  {
    label: "Team",
    items: [
      { title: "Pipeline", subtitle: "Leads by stage", icon: "git-branch-outline", href: "/pipeline" },
      { title: "Team", subtitle: "Members and invitations", icon: "people-outline", roles: MANAGER_ROLES, href: "/team" },
      {
        title: "Handover requests",
        subtitle: "Agents asking to pass a lead on",
        icon: "swap-horizontal-outline",
        roles: MANAGER_ROLES,
        href: "/handovers",
      },
      {
        title: "Live status",
        subtitle: "Who's online and on which lead",
        icon: "radio-outline",
        roles: MANAGER_ROLES,
        feature: "monitoring",
        href: "/monitoring",
      },
      {
        title: "Timesheets",
        subtitle: "Daily hours and attendance",
        icon: "time-outline",
        roles: MANAGER_ROLES,
        feature: "monitoring",
        href: "/timesheets",
      },
      {
        title: "Performance",
        subtitle: "Agent report and targets",
        icon: "trophy-outline",
        roles: MANAGER_ROLES,
        feature: "monitoring",
        href: "/performance",
      },
      {
        title: "Activity feed",
        subtitle: "Every change and sign-in",
        icon: "pulse-outline",
        roles: MANAGER_ROLES,
        feature: "auditLog",
        href: "/activity",
      },
      {
        title: "Import leads",
        subtitle: "From an Excel or CSV file",
        icon: "cloud-upload-outline",
        roles: MANAGER_ROLES,
        feature: "import",
        href: "/leads/import",
      },
      {
        title: "Recycle bin",
        subtitle: "Restore deleted leads",
        icon: "trash-outline",
        roles: MANAGER_ROLES,
        href: "/recycle-bin",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Company", subtitle: "Name, details and logo", icon: "business-outline", roles: ["owner"], href: "/settings/company" },
      { title: "Pipeline", subtitle: "Stages and colours", icon: "git-network-outline", roles: MANAGER_ROLES, href: "/settings/pipeline" },
      { title: "Lead sources", icon: "magnet-outline", roles: MANAGER_ROLES, href: "/settings/sources" },
      {
        title: "Custom fields",
        subtitle: "Extra details on every lead",
        icon: "list-outline",
        roles: MANAGER_ROLES,
        feature: "customFields",
        href: "/settings/custom-fields",
      },
      { title: "Tags", icon: "pricetags-outline", roles: MANAGER_ROLES, href: "/settings/tags" },
      { title: "Lost reasons", icon: "close-circle-outline", roles: MANAGER_ROLES, href: "/settings/lost-reasons" },
      {
        title: "Tracking",
        subtitle: "Idle time, sign-out, time zone, shift",
        icon: "stopwatch-outline",
        roles: MANAGER_ROLES,
        href: "/settings/tracking",
      },
      {
        title: "Team rules",
        subtitle: "Targets, stale leads, daily report",
        icon: "flag-outline",
        roles: MANAGER_ROLES,
        href: "/settings/team-rules",
      },
      { title: "Message templates", icon: "chatbox-ellipses-outline", roles: MANAGER_ROLES, href: "/settings/templates" },
      { title: "Plan & usage", icon: "diamond-outline", roles: MANAGER_ROLES, href: "/settings/plan" },
      { title: "Billing", subtitle: "Prices and invoices", icon: "receipt-outline", roles: MANAGER_ROLES, href: "/settings/billing" },
    ],
  },
  {
    label: "Heapware platform",
    items: [
      { title: "Companies", icon: "business-outline", platformAdmin: true },
      { title: "Announcements", icon: "megaphone-outline", platformAdmin: true },
      { title: "Plans", icon: "diamond-outline", platformAdmin: true },
      { title: "Payments & invoices", icon: "receipt-outline", platformAdmin: true },
    ],
  },
];

/** The sections and items this user can see. */
export function moreSectionsFor(user: Pick<User, "role" | "isPlatformAdmin">) {
  return MORE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => (!item.roles || item.roles.includes(user.role)) && (!item.platformAdmin || user.isPlatformAdmin),
    ),
  })).filter((section) => section.items.length > 0);
}
