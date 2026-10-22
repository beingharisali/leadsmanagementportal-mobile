import type { UserRole } from "@/features/users/types";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/tasks/task.constants.ts) and the website. */
export const TASK_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PART_STATUSES = ["todo", "in_progress", "done"] as const;
export type PartStatus = (typeof PART_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "Waiting for approval",
  done: "Done",
};

export const partStatusLabels: Record<PartStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const recurrenceLabels: Record<RecurrenceFrequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

/** What the signed-in person may do with tasks (`GET /tasks/access`). */
export interface TaskAccess {
  isOwner: boolean;
  canAssign: boolean;
  canManageDepartments: boolean;
  canReceive: boolean;
  department: string | null;
  headOf: string[];
  /** Whether the Tasks area is any use to them at all */
  usesTasks: boolean;
}

export interface TaskPerson {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  department?: string | null;
}

export interface TaskAssignee {
  user: TaskPerson;
  status: PartStatus;
  doneAt?: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  doneBy?: { id: string; name: string } | null;
  doneAt?: string | null;
}

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: TaskAssignee[];
  dueAt?: string | null;
  project?: { id: string; name: string; status: string; manager: string | null } | null;
  requiresApproval: boolean;
  checklist: ChecklistItem[];
  recurrence?: TaskRecurrence | null;
  createdBy: { id: string; name: string; role: UserRole };
  submittedAt?: string | null;
  completedAt?: string | null;
  reviewedBy?: { id: string; name: string } | null;
  reviewedAt?: string | null;
  rejectionNote?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** The viewer's own part, when they're on it */
  myStatus: PartStatus | null;
  /** The viewer gave it, owns the company or manages its project */
  canManage: boolean;
  canReview: boolean;
}

export type TaskScope = "mine" | "given" | "all" | "review";

export interface TaskListParams {
  page?: number;
  limit?: number;
  scope?: TaskScope;
  search?: string;
  status?: TaskStatus[];
  priority?: TaskPriority;
  assignee?: string;
  department?: string;
  project?: string;
  due?: "overdue" | "today" | "week" | "none";
  from?: string;
  to?: string;
  deleted?: boolean;
  sort?: string;
  tzOffset?: number;
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assignees: string[];
  dueAt?: string | null;
  project?: string | null;
  requiresApproval: boolean;
  checklist: { id?: string; text: string; done?: boolean }[];
  recurrence?: TaskRecurrence | null;
}

export interface TaskComment {
  id: string;
  task: string;
  author: UserSummary;
  body: string;
  mentions: UserSummary[];
  editedAt?: string;
  createdAt: string;
}

export interface TaskFile {
  id: string;
  task: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy?: { id: string; name: string };
  createdAt: string;
}

export interface TaskCounts {
  open: number;
  overdue: number;
  dueToday: number;
  inReview: number;
  doneThisWeek: number;
}

export interface TaskSummary {
  mine: TaskCounts;
  given: TaskCounts;
  waitingForMyApproval: number;
  /** The owner's whole team, or a head's departments; null for everyone else */
  team: TaskCounts | null;
}

export interface TaskReportRow {
  user: { id: string; name: string; role: UserRole; department: string | null };
  assigned: number;
  completed: number;
  onTime: number;
  onTimeRate: number | null;
  open: number;
  overdue: number;
}
