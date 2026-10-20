import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { RoleForm } from "@/features/team/components/role-form";
import { useRoles, useUpdateRole } from "@/features/team/hooks";

export default function EditRoleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roles = useRoles();
  const update = useUpdateRole();
  const role = roles.data?.find((r) => r.id === id);

  if (roles.isPending) return <LoadingView />;
  if (!role) return <ErrorView error={roles.error} onRetry={() => void roles.refetch()} />;

  return (
    <Screen>
      <RoleForm
        role={role}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id, payload });
          router.back();
        }}
      />
    </Screen>
  );
}
