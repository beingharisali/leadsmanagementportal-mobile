import type { OrganizationSummary } from "@/features/organizations/types";

/** Mirrors the API (server/src/modules/users/user.constants.ts). */
export const USER_ROLES = ["owner", "admin", "agent", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles with admin rights: all leads, team, reports. The owner also manages the organization. */
export const MANAGER_ROLES: UserRole[] = ["owner", "admin"];

export function isManagerRole(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}

/** Roles that work with leads (leads, pipeline, follow-ups). Team members with a custom role don't. */
export const LEAD_ROLES: UserRole[] = ["owner", "admin", "agent"];

export function worksLeads(role: UserRole) {
  return LEAD_ROLES.includes(role);
}

/**
 * Adding members, inviting and managing custom roles: the owner, or an admin
 * the owner has given team access (server/src/modules/users/team-access.ts).
 */
export function hasTeamAccess(user: Pick<User, "role" | "canManageTeam">) {
  return user.role === "owner" || (user.role === "admin" && Boolean(user.canManageTeam));
}

export const userRoleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agent",
  member: "Team member",
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** A team member's custom role id (see features/member-roles) */
  memberRole?: string | null;
  /** Admins: the owner has let them add / invite people and manage roles */
  canManageTeam?: boolean;
  /** The department they work in (see features/departments); the owner has none */
  department?: string | null;
  /** Admins and members: the owner lets them give tasks and create projects */
  canAssignTasks?: boolean;
  /** Admins and members: the owner lets them manage departments */
  canManageDepartments?: boolean;
  isActive: boolean;
  /** False only for an owner who signed up and hasn't confirmed their email yet */
  emailVerified: boolean;
  /** Heapware staff with access to the platform console */
  isPlatformAdmin?: boolean;
  /** Only during a support session: Heapware staff signed in as this user (read-only) */
  support?: { sessionId: string; staffName: string; startedAt: string; expiresAt: string };
  /** Only on the signed-in user (`/auth/me`) */
  organization?: OrganizationSummary;
  /** Their own working hours instead of their department's or the company's shift */
  shift?: UserShift | null;
  /** How they check in; empty means the usual rules */
  checkInRules?: CheckInRules | null;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Roles that can be given (the owner role is never handed out in the app).
 * `member` is a team member with a custom role such as "Developer".
 */
export const ASSIGNABLE_ROLES = ["admin", "agent", "member"] as const satisfies readonly UserRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** How one person checks in (see server check-ins/check-in.rules.ts). */
export interface CheckInRules {
  /** Off: they don't check in; their days are measured from sign-ins */
  required: boolean;
  /** Off: checking in works without the location */
  locationRequired: boolean;
  /** Off: nobody is told when they're late or haven't checked in */
  alerts: boolean;
  /** Off: no breaks */
  breaks: boolean;
  /** Checking in up to this many minutes late still counts as on time */
  graceMinutes: number;
}

export const DEFAULT_CHECK_IN_RULES: CheckInRules = {
  required: true,
  locationRequired: true,
  alerts: true,
  breaks: true,
  graceMinutes: 0,
};

/** `GET /users/:id/working-hours`: which shift applies to them and how they check in. */
export interface WorkingHours {
  own: UserShift | null;
  department: { id: string; name: string; shift: UserShift | null } | null;
  company: UserShift;
  effective: UserShift & { source: "own" | "department" | "company" };
  checkInRules: CheckInRules;
  /** False for the owner */
  canCheckIn: boolean;
}

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
