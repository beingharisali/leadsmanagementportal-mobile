import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { DepartmentForm } from "@/features/team/components/department-form";
import { useCreateDepartment } from "@/features/team/hooks";

export default function NewDepartmentScreen() {
  const create = useCreateDepartment();
  return (
    <Screen>
      <DepartmentForm
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          router.back();
        }}
      />
    </Screen>
  );
}
