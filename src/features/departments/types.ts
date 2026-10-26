import type { UserRole, UserShift } from "@/features/users/types";

/** Mirrors the API (server/src/modules/departments). */
export interface Department {
  id: string;
  name: string;
  description?: string;
  /** Built-in: "general" (General Team) or "sales"; they can't be renamed or deleted */
  kind: "general" | "sales" | null;
  head: { id: string; name: string; email: string; role: UserRole; isActive: boolean } | null;
  /** Working hours for its people who don't have their own; empty means the company's shift */
  shift?: UserShift | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface DepartmentDetail extends Department {
  members: DepartmentMember[];
}

export interface DepartmentPayload {
  name: string;
  description?: string | null;
  head?: string | null;
  shift?: UserShift | null;
}

/** Someone who can be moved between departments; `canHead` for active admins and members. */
export interface DepartmentPerson {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  canHead: boolean;
}
