import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TaskForm } from "@/features/tasks/components/task-form";
import { useTask, useUpdateTask } from "@/features/tasks/hooks";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);
  const update = useUpdateTask();

  if (task.isPending) return <LoadingView />;
  if (!task.data) return <ErrorView error={task.error} onRetry={() => void task.refetch()} />;

  return (
    <Screen>
      <TaskForm
        task={task.data}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id, payload });
          router.back();
        }}
      />
    </Screen>
  );
}
