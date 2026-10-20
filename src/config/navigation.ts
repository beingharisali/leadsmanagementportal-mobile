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
  /** Hidden entirely (not shown with a lock) when `feature` isn't available — for per-company features */
  hideWhenLocked?: boolean;
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
    label: "Team Workspace",
    items: [
      {
        title: "Departments",
        subtitle: "Teams and their leads",
        icon: "people-circle-outline",
        feature: "teamWorkspace",
        hideWhenLocked: true,
        href: "/team/departments",
      },
      {
        title: "Org chart",
        subtitle: "Who reports to whom",
        icon: "git-network-outline",
        feature: "teamWorkspace",
        hideWhenLocked: true,
        href: "/team/org-chart",
      },
      {
        title: "Roles & permissions",
        subtitle: "Custom roles and access",
        icon: "shield-checkmark-outline",
        roles: MANAGER_ROLES,
        feature: "teamWorkspace",
        hideWhenLocked: true,
        href: "/team/roles",
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
      { title: "Overview", subtitle: "Every company at a glance", icon: "speedometer-outline", platformAdmin: true, href: "/console" },
      { title: "Companies", subtitle: "Manage, suspend, invoice", icon: "business-outline", platformAdmin: true, href: "/console/companies" },
      { title: "Announcements", icon: "megaphone-outline", platformAdmin: true, href: "/console/announcements" },
      { title: "Support log", subtitle: "Support sign-ins", icon: "help-buoy-outline", platformAdmin: true, href: "/console/support" },
      { title: "Plans", subtitle: "Limits and features", icon: "diamond-outline", platformAdmin: true, href: "/console/plans" },
      { title: "Payments", subtitle: "Receipts to review", icon: "card-outline", platformAdmin: true, href: "/console/payments" },
      { title: "Invoices", icon: "document-text-outline", platformAdmin: true, href: "/console/invoices" },
      {
        title: "Billing settings",
        subtitle: "Prices, reminders, payment accounts",
        icon: "wallet-outline",
        platformAdmin: true,
        href: "/console/billing-settings",
      },
    ],
  },
];

/** The sections and items this user can see. */
export function moreSectionsFor(user: Pick<User, "role" | "isPlatformAdmin" | "organization">) {
  const features = user.organization?.features ?? [];
  return MORE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.roles || item.roles.includes(user.role)) &&
        (!item.platformAdmin || user.isPlatformAdmin) &&
        // Per-company features (e.g. Team Workspace) are hidden entirely when off.
        (!item.hideWhenLocked || !item.feature || features.includes(item.feature)),
    ),
  })).filter((section) => section.items.length > 0);
}
