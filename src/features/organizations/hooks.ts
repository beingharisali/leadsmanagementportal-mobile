import { useAuth } from "@/features/auth/auth-provider";

/** False while the workspace is read-only (trial over, payment overdue): hide buttons that change data. */
export function useCanEdit() {
  const { user } = useAuth();
  return !user?.organization?.readOnly;
}
