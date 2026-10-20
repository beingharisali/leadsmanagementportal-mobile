import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { RoleForm } from "@/features/team/components/role-form";
import { useCreateRole } from "@/features/team/hooks";

export default function NewRoleScreen() {
  const create = useCreateRole();
  return (
    <Screen>
      <RoleForm
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.back();
        }}
      />
    </Screen>
  );
}
