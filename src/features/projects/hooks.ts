import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TaskPerson } from "@/features/tasks/types";
import { apiClient } from "@/lib/api-client";

import type { Project, ProjectDetail, ProjectListParams, ProjectPayload } from "./types";

/** Same endpoints as the website (server/src/modules/projects). */
const projectsApi = {
  list: (params: ProjectListParams) => apiClient.getPaginated<Project>("/projects", { ...params }),
  get: (id: string) => apiClient.get<ProjectDetail>(`/projects/${id}`),
  memberOptions: () => apiClient.get<TaskPerson[]>("/projects/member-options"),
  create: (payload: ProjectPayload) => apiClient.post<ProjectDetail>("/projects", payload),
  update: (id: string, payload: Partial<ProjectPayload>) => apiClient.patch<ProjectDetail>(`/projects/${id}`, payload),
  remove: (id: string) => apiClient.delete<null>(`/projects/${id}`),
  restore: (id: string) => apiClient.post<ProjectDetail>(`/projects/${id}/restore`),
  purge: (id: string) => apiClient.delete<null>(`/projects/${id}/permanent`),
};

export const projectKeys = {
  all: ["projects"] as const,
  list: (params: ProjectListParams) => [...projectKeys.all, "list", params] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
  memberOptions: () => [...projectKeys.all, "member-options"] as const,
};

export function useProjects(params: ProjectListParams, enabled = true) {
  return useQuery({ queryKey: projectKeys.list(params), queryFn: () => projectsApi.list(params), placeholderData: keepPreviousData, enabled });
}

export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectsApi.get(id) });
}

export function useProjectMemberOptions() {
  return useQuery({ queryKey: projectKeys.memberOptions(), queryFn: projectsApi.memberOptions, staleTime: 60_000 });
}

function useProjectMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export const useCreateProject = () => useProjectMutation((payload: ProjectPayload) => projectsApi.create(payload));
export const useUpdateProject = () =>
  useProjectMutation(({ id, payload }: { id: string; payload: Partial<ProjectPayload> }) => projectsApi.update(id, payload));
export const useDeleteProject = () => useProjectMutation((id: string) => projectsApi.remove(id));
export const useRestoreProject = () => useProjectMutation((id: string) => projectsApi.restore(id));
export const usePurgeProject = () => useProjectMutation((id: string) => projectsApi.purge(id));
