import { useAuth } from "@/features/auth/auth-provider";
import { useViewAsTarget } from "@/lib/view-as";

/**
 * False while the workspace is read-only (trial over, payment overdue) or a
 * manager is viewing as an agent: hide buttons that change data.
 */
export function useCanEdit() {
  const { user } = useAuth();
  const viewingAs = useViewAsTarget();
  return !user?.organization?.readOnly && !viewingAs;
}
