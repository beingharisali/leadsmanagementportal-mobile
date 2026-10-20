import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { DepartmentForm } from "@/features/team/components/department-form";
import { useDepartment, useUpdateDepartment } from "@/features/team/hooks";

export default function EditDepartmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const department = useDepartment(id);
  const update = useUpdateDepartment();

  if (department.isPending) return <LoadingView />;
  if (!department.data) return <ErrorView error={department.error} onRetry={() => void department.refetch()} />;

  return (
    <Screen>
      <DepartmentForm
        department={department.data}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id, payload });
          router.back();
        }}
      />
    </Screen>
  );
}
