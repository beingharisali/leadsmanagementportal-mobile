import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useHasFeature } from "@/features/plans/hooks";
import { apiClient } from "@/lib/api-client";

import type { Department, DepartmentDetail, DepartmentPayload, DepartmentPerson } from "./types";

/** Same endpoints as the website (server/src/modules/departments). */
const departmentsApi = {
  list: () => apiClient.get<Department[]>("/departments"),
  get: (id: string) => apiClient.get<DepartmentDetail>(`/departments/${id}`),
  people: () => apiClient.get<DepartmentPerson[]>("/departments/people"),
  create: (payload: DepartmentPayload) => apiClient.post<Department>("/departments", payload),
  update: (id: string, payload: Partial<DepartmentPayload>) => apiClient.patch<Department>(`/departments/${id}`, payload),
  moveMembers: (id: string, userIds: string[]) => apiClient.post<{ moved: number }>(`/departments/${id}/members`, { userIds }),
  remove: (id: string) => apiClient.delete<{ id: string; movedTo: Department; membersMoved: number }>(`/departments/${id}`),
};

export const departmentKeys = {
  all: ["departments"] as const,
  detail: (id: string) => [...departmentKeys.all, id] as const,
  people: () => [...departmentKeys.all, "people"] as const,
};

/** The company's departments: General Team and Sales first. */
export function useDepartments(enabled = true) {
  const hasWork = useHasFeature("workManagement");
  return useQuery({ queryKey: departmentKeys.all, queryFn: departmentsApi.list, enabled: enabled && hasWork, staleTime: 60_000 });
}

export function useDepartment(id: string) {
  return useQuery({ queryKey: departmentKeys.detail(id), queryFn: () => departmentsApi.get(id) });
}

/** Everyone but the owner, for people who manage departments. */
export function useDepartmentPeople(enabled = true) {
  const hasWork = useHasFeature("workManagement");
  return useQuery({ queryKey: departmentKeys.people(), queryFn: departmentsApi.people, enabled: enabled && hasWork, staleTime: 60_000 });
}

/** A department id → its name ("—" when there's none). */
export function useDepartmentName() {
  const { data } = useDepartments();
  return (id: string | null | undefined) => (id ? (data?.find((d) => d.id === id)?.name ?? "—") : "—");
}

function useDepartmentMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export const useCreateDepartment = () => useDepartmentMutation((payload: DepartmentPayload) => departmentsApi.create(payload));
export const useUpdateDepartment = () =>
  useDepartmentMutation(({ id, payload }: { id: string; payload: Partial<DepartmentPayload> }) => departmentsApi.update(id, payload));
export const useMoveToDepartment = () =>
  useDepartmentMutation(({ id, userIds }: { id: string; userIds: string[] }) => departmentsApi.moveMembers(id, userIds));
export const useDeleteDepartment = () => useDepartmentMutation((id: string) => departmentsApi.remove(id));
