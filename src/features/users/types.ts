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
  /** Only during a support session: Heapware staff signed in as this user (read-only) */
  support?: { sessionId: string; staffName: string; startedAt: string; expiresAt: string };
  /** Only on the signed-in user (`/auth/me`) */
  organization?: OrganizationSummary;
  /** Their own working hours instead of the company's shift */
  shift?: UserShift | null;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Roles an owner or admin can give (the owner role is never handed out in the app). */
export const ASSIGNABLE_ROLES = ["admin", "agent"] as const satisfies readonly UserRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface UserShift {
  /** "HH:MM" */
  start: string;
  end: string;
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Same rule as the API (server/src/modules/auth/password.ts); `null` when fine. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "At least 8 characters";
  if (!/[A-Za-z]/.test(password)) return "Must contain a letter";
  if (!/\d/.test(password)) return "Must contain a number";
  return null;
}
