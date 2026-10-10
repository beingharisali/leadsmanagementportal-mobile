import type { OrganizationSummary } from "@/features/organizations/types";

/** Mirrors the API (server/src/modules/users/user.constants.ts). */
export const USER_ROLES = ["owner", "admin", "agent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles with admin rights: all leads, team, reports. The owner also manages the organization. */
export const MANAGER_ROLES: UserRole[] = ["owner", "admin"];

export function isManagerRole(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}

export const userRoleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agent",
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  /** False only for an owner who signed up and hasn't confirmed their email yet */
  emailVerified: boolean;
  /** Heapware staff with access to the platform console */
  isPlatformAdmin?: boolean;
  /** Only on the signed-in user (`/auth/me`) */
  organization?: OrganizationSummary;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
