import type { ColorName } from "@/features/customization/types";
import { formatDate, formatDateTime } from "@/lib/format";

import type { PartStatus, Task, TaskPriority, TaskRecurrence, TaskStatus } from "./types";

/** Same colours as the website's badges. */
export const taskStatusColors: Record<TaskStatus, ColorName> = {
  todo: "slate",
  in_progress: "sky",
  in_review: "amber",
  done: "emerald",
};

export const partStatusColors: Record<PartStatus, ColorName> = {
  todo: "slate",
  in_progress: "sky",
  done: "emerald",
};

export const taskPriorityColors: Record<TaskPriority, ColorName> = {
  low: "slate",
  medium: "sky",
  high: "orange",
  urgent: "rose",
};

export function isOverdue(task: Pick<Task, "dueAt" | "status">, now = new Date()) {
  return task.status !== "done" && Boolean(task.dueAt) && new Date(task.dueAt!) < now;
}

/** "Today, 5:00 PM", "Tomorrow, …" or the date. */
export function formatDue(dueAt: string, now = new Date()) {
  const due = new Date(dueAt);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(due) - day(now)) / 86_400_000);
  const time = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  return Math.abs(diff) < 180 ? formatDateTime(dueAt) : formatDate(dueAt);
}

export function describeRecurrence(recurrence: TaskRecurrence | null | undefined) {
  if (!recurrence) return null;
  const unit = { daily: "day", weekly: "week", monthly: "month" }[recurrence.frequency];
  return recurrence.interval === 1 ? `Every ${unit}` : `Every ${recurrence.interval} ${unit}s`;
}

export function partsDone(task: Pick<Task, "assignees">) {
  return { done: task.assignees.filter((a) => a.status === "done").length, total: task.assignees.length };
}

/** History labels (same words as the website's activity feed). */
export const historyActionLabels: Record<string, string> = {
  created: "created it",
  updated: "updated it",
  status_changed: "updated their part",
  deleted: "moved it to the recycle bin",
  restored: "restored it",
  submitted: "sent it for approval",
  approved: "approved it",
  rejected: "sent it back",
  completed: "completed it",
  reopened: "reopened it",
  comment_added: "commented",
  attachment_added: "attached a file",
  attachment_removed: "removed a file",
};

export const historyFieldLabels: Record<string, string> = {
  title: "Title",
  description: "Details",
  priority: "Priority",
  dueAt: "Due",
  assignees: "People",
  project: "Project",
  requiresApproval: "Needs approval",
  recurrence: "Repeats",
  checklist: "Checklist",
  myPart: "Their part",
  status: "Status",
};

export function formatHistoryValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "dueAt" && typeof value === "string") return formatDateTime(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
