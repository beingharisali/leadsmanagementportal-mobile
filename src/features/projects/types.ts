import type { TaskPerson } from "@/features/tasks/types";

/** Mirrors the API (server/src/modules/projects). */
export const PROJECT_STATUSES = ["active", "on_hold", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

export interface ProjectProgress {
  total: number;
  done: number;
  overdue: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientName?: string;
  members: TaskPerson[];
  manager: TaskPerson | null;
  startDate?: string | null;
  deadline?: string | null;
  status: ProjectStatus;
  createdBy: { id: string; name: string };
  deletedAt?: string | null;
  progress: ProjectProgress;
  createdAt: string;
  updatedAt: string;
}

/** A single project also says what the viewer may do with it. */
export interface ProjectDetail extends Project {
  canManage: boolean;
  canAddTasks: boolean;
}

export interface ProjectPayload {
  name: string;
  description?: string | null;
  clientName?: string | null;
  members: string[];
  manager?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  status: ProjectStatus;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  deleted?: boolean;
  sort?: string;
}
