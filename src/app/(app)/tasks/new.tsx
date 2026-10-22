import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { TaskForm } from "@/features/tasks/components/task-form";
import { useCreateTask } from "@/features/tasks/hooks";

/** A new task; `?projectId=` starts it in that project. */
export default function NewTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const create = useCreateTask();
  return (
    <Screen>
      <TaskForm
        projectId={projectId}
        onSubmit={async (payload) => {
          const task = await create.mutateAsync(payload);
          router.replace({ pathname: "/tasks/[id]", params: { id: task.id } });
        }}
      />
    </Screen>
  );
}
