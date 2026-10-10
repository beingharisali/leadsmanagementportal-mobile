import type Ionicons from "@expo/vector-icons/Ionicons";
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
  href?: "/pipeline" | "/handovers" | "/recycle-bin" | "/leads/import";
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
      { title: "Team", subtitle: "Members and invitations", icon: "people-outline", roles: MANAGER_ROLES },
      {
        title: "Handover requests",
        subtitle: "Agents asking to pass a lead on",
        icon: "swap-horizontal-outline",
        roles: MANAGER_ROLES,
        href: "/handovers",
      },
      { title: "Live status", icon: "radio-outline", roles: MANAGER_ROLES, feature: "monitoring" },
      { title: "Timesheets", icon: "time-outline", roles: MANAGER_ROLES, feature: "monitoring" },
      { title: "Performance", icon: "trophy-outline", roles: MANAGER_ROLES, feature: "monitoring" },
      { title: "Activity feed", icon: "pulse-outline", roles: MANAGER_ROLES, feature: "auditLog" },
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
