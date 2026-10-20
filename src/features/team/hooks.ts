import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import type { Department, PermissionMatrix, PermissionScope, Role } from "./types";

export interface DepartmentPayload {
  name: string;
  description?: string;
  color: string;
  teamLead?: string | null;
}

export interface RolePayload {
  name: string;
  description?: string;
  permissions: PermissionMatrix;
  scope: PermissionScope;
  departments: string[];
}

export const teamKeys = {
  departments: ["team", "departments"] as const,
  department: (id: string) => ["team", "departments", id] as const,
  roles: ["team", "roles"] as const,
};

// ---- Departments

export function useDepartments(enabled = true) {
  return useQuery({
    queryKey: teamKeys.departments,
    queryFn: () => apiClient.get<Department[]>("/departments"),
    enabled,
    staleTime: 60_000,
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: teamKeys.department(id ?? ""),
    queryFn: () => apiClient.get<Department>(`/departments/${id}`),
    enabled: !!id,
  });
}

function useInvalidateTeam(extra: readonly unknown[]) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: extra });
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };
}

export function useCreateDepartment() {
  const invalidate = useInvalidateTeam(teamKeys.departments);
  return useMutation({
    mutationFn: (payload: DepartmentPayload) => apiClient.post<Department>("/departments", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateDepartment() {
  const invalidate = useInvalidateTeam(teamKeys.departments);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DepartmentPayload> }) =>
      apiClient.patch<Department>(`/departments/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartment() {
  const invalidate = useInvalidateTeam(teamKeys.departments);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/departments/${id}`),
    onSuccess: invalidate,
  });
}

// ---- Custom roles

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: teamKeys.roles,
    queryFn: () => apiClient.get<Role[]>("/roles"),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateRole() {
  const invalidate = useInvalidateTeam(teamKeys.roles);
  return useMutation({
    mutationFn: (payload: RolePayload) => apiClient.post<Role>("/roles", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateTeam(teamKeys.roles);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RolePayload> }) =>
      apiClient.patch<Role>(`/roles/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateTeam(teamKeys.roles);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/roles/${id}`),
    onSuccess: invalidate,
  });
}
