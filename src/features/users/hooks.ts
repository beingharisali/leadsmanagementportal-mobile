import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import type { UserRole } from "./types";

export interface AssignableUser {
  id: string;
  name: string;
  role: UserRole;
}

/** Active team members a lead can be given to. Managers only (the API refuses agents). */
export function useAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: ["users", "assignable"],
    queryFn: () => apiClient.get<AssignableUser[]>("/users/assignable"),
    staleTime: 5 * 60_000,
    enabled,
  });
}
