/**
 * Team Workspace types — mirror the API:
 *   server/src/modules/permissions/permission.constants.ts
 *   server/src/modules/departments/department.model.ts
 *   server/src/modules/roles/role.model.ts
 */
import type { ColorName } from "@/features/customization/types";

export const PERMISSION_MODULES = ["leads", "tasks", "projects", "attendance", "reports"] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type ModulePermissions = Record<PermissionAction, boolean>;
export type PermissionMatrix = Record<PermissionModule, ModulePermissions>;

export const PERMISSION_SCOPES = ["all", "departments"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const permissionModuleLabels: Record<PermissionModule, string> = {
  leads: "Leads",
  tasks: "Tasks",
  projects: "Projects",
  attendance: "Attendance",
  reports: "Reports",
};

export const permissionActionLabels: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
};

export function emptyModulePermissions(): ModulePermissions {
  return { view: false, create: false, edit: false, delete: false, approve: false };
}

export function emptyPermissionMatrix(): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map((m) => [m, emptyModulePermissions()]),
  ) as PermissionMatrix;
}

export interface ResolvedPermissions {
  isManager: boolean;
  matrix: PermissionMatrix;
  leads: string[];
  departments: string[];
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color: ColorName;
  teamLead: UserRef | null;
  memberCount?: number;
  members?: UserRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionMatrix;
  scope: PermissionScope;
  departments: string[];
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}
