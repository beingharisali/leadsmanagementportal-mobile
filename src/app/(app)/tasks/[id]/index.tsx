import { useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TaskDetail } from "@/features/tasks/components/task-detail";
import { useTask } from "@/features/tasks/hooks";

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);

  if (task.isPending) return <LoadingView />;
  if (!task.data) return <ErrorView error={task.error} onRetry={() => void task.refetch()} />;

  return (
    <Screen onRefresh={() => task.refetch()}>
      <TaskDetail task={task.data} />
    </Screen>
  );
}
