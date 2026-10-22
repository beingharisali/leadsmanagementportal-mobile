import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { WorkAccessFlags } from "@/config/navigation";
import type { PickedFile } from "@/features/attachments/hooks";
import { useHasFeature } from "@/features/plans/hooks";
import { apiClient, apiUrl, authHeaders, readEnvelope } from "@/lib/api-client";

import type {
  PartStatus,
  Task,
  TaskAccess,
  TaskComment,
  TaskFile,
  TaskListParams,
  TaskPayload,
  TaskPerson,
  TaskReportRow,
  TaskSummary,
} from "./types";

/** Same endpoints as the website (server/src/modules/tasks). */
export const tasksApi = {
  access: () => apiClient.get<TaskAccess>("/tasks/access"),
  assignable: (project?: string) => apiClient.get<TaskPerson[]>("/tasks/assignable", { project }),
  summary: () => apiClient.get<TaskSummary>("/tasks/summary", { tzOffset: new Date().getTimezoneOffset() }),
  report: (params: { from: string; to: string; department?: string }) => apiClient.get<TaskReportRow[]>("/tasks/report", params),
  list: (params: TaskListParams) =>
    apiClient.getPaginated<Task>("/tasks", { ...params, tzOffset: new Date().getTimezoneOffset() }),
  get: (id: string) => apiClient.get<Task>(`/tasks/${id}`),
  create: (payload: TaskPayload) => apiClient.post<Task>("/tasks", payload),
  update: (id: string, payload: Partial<TaskPayload>) => apiClient.patch<Task>(`/tasks/${id}`, payload),
  setMyStatus: (id: string, status: PartStatus) => apiClient.post<Task>(`/tasks/${id}/my-status`, { status }),
  review: (id: string, decision: "approve" | "reject", note?: string) =>
    apiClient.post<Task>(`/tasks/${id}/review`, { decision, note }),
  reopen: (id: string) => apiClient.post<Task>(`/tasks/${id}/reopen`),
  toggleItem: (id: string, itemId: string, done: boolean) => apiClient.patch<Task>(`/tasks/${id}/checklist/${itemId}`, { done }),
  remove: (id: string) => apiClient.delete<null>(`/tasks/${id}`),
  restore: (id: string) => apiClient.post<Task>(`/tasks/${id}/restore`),
  purge: (id: string) => apiClient.delete<null>(`/tasks/${id}/permanent`),
  history: (id: string) =>
    apiClient.get<
      {
        id: string;
        action: string;
        actor?: { name: string };
        message?: string;
        changes: { field: string; from: unknown; to: unknown }[];
        createdAt: string;
      }[]
    >(`/tasks/${id}/history`),
  comments: (id: string) => apiClient.get<TaskComment[]>(`/tasks/${id}/comments`),
  mentionable: (id: string) => apiClient.get<{ id: string; name: string }[]>(`/tasks/${id}/mentionable`),
  addComment: (id: string, body: string) => apiClient.post<TaskComment>(`/tasks/${id}/comments`, { body }),
  editComment: (id: string, commentId: string, body: string) =>
    apiClient.patch<TaskComment>(`/tasks/${id}/comments/${commentId}`, { body }),
  removeComment: (id: string, commentId: string) => apiClient.delete<null>(`/tasks/${id}/comments/${commentId}`),
  files: (id: string) => apiClient.get<TaskFile[]>(`/tasks/${id}/files`),
  removeFile: (id: string, fileId: string) => apiClient.delete<null>(`/tasks/${id}/files/${fileId}`),
};

export const taskKeys = {
  all: ["tasks"] as const,
  access: () => [...taskKeys.all, "access"] as const,
  assignable: (project?: string) => [...taskKeys.all, "assignable", project ?? ""] as const,
  summary: () => [...taskKeys.all, "summary"] as const,
  report: (params: object) => [...taskKeys.all, "report", params] as const,
  list: (params: TaskListParams) => [...taskKeys.all, "list", params] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  history: (id: string) => [...taskKeys.all, "history", id] as const,
  comments: (id: string) => [...taskKeys.all, "comments", id] as const,
  mentionable: (id: string) => [...taskKeys.all, "mentionable", id] as const,
  files: (id: string) => [...taskKeys.all, "files", id] as const,
};

/**
 * What the signed-in person may do with tasks; drives menus and buttons.
 * Not asked at all without Work management (paid Business), so nothing about it shows.
 */
export function useTaskAccess() {
  const enabled = useHasFeature("workManagement");
  return useQuery({ queryKey: taskKeys.access(), queryFn: tasksApi.access, staleTime: 60_000, enabled });
}

/** Which work screens show in the More tab (same rules as the website's sidebar). */
export function useWorkAccess(): WorkAccessFlags | undefined {
  const { data } = useTaskAccess();
  const hasWork = useHasFeature("workManagement");
  if (!hasWork || !data) return undefined;
  const heads = data.headOf.length > 0;
  return {
    tasks: data.usesTasks,
    departments: data.isOwner || data.canManageDepartments || heads,
    taskReports: data.isOwner || heads,
  };
}

export function useAssignablePeople(project?: string) {
  return useQuery({ queryKey: taskKeys.assignable(project), queryFn: () => tasksApi.assignable(project), staleTime: 60_000 });
}

export function useTaskSummary(enabled = true) {
  return useQuery({ queryKey: taskKeys.summary(), queryFn: tasksApi.summary, enabled });
}

export function useTaskReport(params: { from: string; to: string; department?: string }) {
  return useQuery({ queryKey: taskKeys.report(params), queryFn: () => tasksApi.report(params), placeholderData: keepPreviousData });
}

export function useTasks(params: TaskListParams, enabled = true) {
  return useQuery({ queryKey: taskKeys.list(params), queryFn: () => tasksApi.list(params), placeholderData: keepPreviousData, enabled });
}

export function useTask(id: string) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => tasksApi.get(id) });
}

export function useTaskHistory(id: string) {
  return useQuery({ queryKey: taskKeys.history(id), queryFn: () => tasksApi.history(id) });
}

/** Any change can move a task between lists, counts and its project's progress. */
function useTaskMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export const useCreateTask = () => useTaskMutation((payload: TaskPayload) => tasksApi.create(payload));
export const useUpdateTask = () =>
  useTaskMutation(({ id, payload }: { id: string; payload: Partial<TaskPayload> }) => tasksApi.update(id, payload));
export const useSetMyStatus = () =>
  useTaskMutation(({ id, status }: { id: string; status: PartStatus }) => tasksApi.setMyStatus(id, status));
export const useReviewTask = () =>
  useTaskMutation(({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
    tasksApi.review(id, decision, note),
  );
export const useReopenTask = () => useTaskMutation((id: string) => tasksApi.reopen(id));
export const useToggleChecklistItem = () =>
  useTaskMutation(({ id, itemId, done }: { id: string; itemId: string; done: boolean }) => tasksApi.toggleItem(id, itemId, done));
export const useDeleteTask = () => useTaskMutation((id: string) => tasksApi.remove(id));
export const useRestoreTask = () => useTaskMutation((id: string) => tasksApi.restore(id));
export const usePurgeTask = () => useTaskMutation((id: string) => tasksApi.purge(id));

export function useTaskComments(id: string) {
  return useQuery({ queryKey: taskKeys.comments(id), queryFn: () => tasksApi.comments(id), refetchInterval: 60_000 });
}

export function useTaskMentionable(id: string, enabled: boolean) {
  return useQuery({ queryKey: taskKeys.mentionable(id), queryFn: () => tasksApi.mentionable(id), enabled, staleTime: 5 * 60_000 });
}

function useDetailMutation<TVars>(id: string, keys: readonly (readonly unknown[])[], mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.history(id) });
    },
  });
}

export const useAddTaskComment = (id: string) =>
  useDetailMutation(id, [taskKeys.comments(id)], (body: string) => tasksApi.addComment(id, body));
export const useEditTaskComment = (id: string) =>
  useDetailMutation(id, [taskKeys.comments(id)], ({ commentId, body }: { commentId: string; body: string }) =>
    tasksApi.editComment(id, commentId, body),
  );
export const useDeleteTaskComment = (id: string) =>
  useDetailMutation(id, [taskKeys.comments(id)], (commentId: string) => tasksApi.removeComment(id, commentId));

export function useTaskFiles(id: string) {
  return useQuery({ queryKey: taskKeys.files(id), queryFn: () => tasksApi.files(id) });
}

/** The file goes as the raw request body, its name in `?name=` (same as lead files). */
async function upload(id: string, file: PickedFile) {
  const result = await new File(file.uri).upload(apiUrl(`/tasks/${id}/files?name=${encodeURIComponent(file.name)}`), {
    httpMethod: "POST",
    headers: { ...authHeaders(), Accept: "application/json", "Content-Type": "application/octet-stream" },
  });
  return readEnvelope<TaskFile>(result.status, result.body);
}

export const useUploadTaskFile = (id: string) => useDetailMutation(id, [taskKeys.files(id)], (file: PickedFile) => upload(id, file));
export const useDeleteTaskFile = (id: string) =>
  useDetailMutation(id, [taskKeys.files(id)], (fileId: string) => tasksApi.removeFile(id, fileId));

/** Downloads the file (signed in) to the phone's cache, then opens the share sheet. */
export async function openTaskFile(taskId: string, file: TaskFile) {
  const target = new File(Paths.cache, `${file.id}-${file.fileName.replace(/[\\/]/g, "_")}`);
  if (!target.exists) {
    await File.downloadFileAsync(apiUrl(`/tasks/${taskId}/files/${file.id}`), target, { headers: authHeaders(), idempotent: true });
  }
  await Sharing.shareAsync(target.uri, { mimeType: file.contentType, dialogTitle: file.fileName });
}
