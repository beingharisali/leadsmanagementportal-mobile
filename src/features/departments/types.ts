import type { UserRole, UserShift } from "@/features/users/types";

/** Mirrors the API (server/src/modules/departments). */
export interface Department {
  id: string;
  name: string;
  description?: string;
  /** Built-in: "general" (General Team) or "sales"; they can't be renamed or deleted */
  kind: "general" | "sales" | null;
  /** Who heads it; empty for nobody. Each sees every task of the people in it. */
  heads: { id: string; name: string; email: string; role: UserRole; isActive: boolean }[];
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
  heads?: string[];
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

/** "Head: Laila" / "Heads: Laila, Danish" / "Head: nobody" */
export function headsLabel(department: Pick<Department, "heads">) {
  const heads = department.heads ?? [];
  if (heads.length === 0) return "Head: nobody";
  return `${heads.length === 1 ? "Head" : "Heads"}: ${heads.map((h) => h.name).join(", ")}`;
}
