import type Ionicons from "@expo/vector-icons/Ionicons";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";

import type { PlanFeature } from "@/features/plans/types";
import { LEAD_ROLES, MANAGER_ROLES, type User, type UserRole } from "@/features/users/types";

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
  /** With `feature`: left out entirely (rather than locked) when the company doesn't have it */
  hideWhenLocked?: boolean;
  /** Heapware staff only */
  platformAdmin?: boolean;
  /** Shown only with this work access (see features/tasks/hooks.ts `useWorkAccess`) */
  requires?: keyof WorkAccessFlags;
  /** The screen it opens; items without one show "coming soon" */
  href?: Href;
}

/** Which work screens (tasks, departments, reports) someone can use. */
export interface WorkAccessFlags {
  tasks: boolean;
  departments: boolean;
  taskReports: boolean;
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
    label: "Work",
    items: [
      { title: "Tasks", subtitle: "Yours and your team's", icon: "clipboard-outline", requires: "tasks", href: "/tasks" },
      { title: "Projects", subtitle: "Client work and progress", icon: "folder-open-outline", requires: "tasks", href: "/projects" },
      {
        title: "Task reports",
        subtitle: "How each person is doing",
        icon: "bar-chart-outline",
        requires: "taskReports",
        href: "/task-reports",
      },
      {
        title: "Departments",
        subtitle: "Heads and people",
        icon: "git-network-outline",
        requires: "departments",
        href: "/departments",
      },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Pipeline", subtitle: "Leads by stage", icon: "git-branch-outline", roles: LEAD_ROLES, href: "/pipeline" },
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
        title: "Check-ins",
        subtitle: "Who's in, breaks and locations",
        icon: "location-outline",
        roles: MANAGER_ROLES,
        feature: "checkIns",
        hideWhenLocked: true,
        href: "/check-ins",
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

/** The sections and items this user can see. Without `work` (still loading), work items are left out. */
export function moreSectionsFor(user: Pick<User, "role" | "isPlatformAdmin" | "organization">, work?: WorkAccessFlags) {
  const features = user.organization?.features;
  return MORE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.roles || item.roles.includes(user.role)) &&
        (!item.platformAdmin || user.isPlatformAdmin) &&
        (!item.requires || Boolean(work?.[item.requires])) &&
        !(item.hideWhenLocked && item.feature && features && !features.includes(item.feature)),
    ),
  })).filter((section) => section.items.length > 0);
}
