import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { ProjectForm } from "@/features/projects/components/project-form";
import { useProject, useUpdateProject } from "@/features/projects/hooks";

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useUpdateProject();

  if (project.isPending) return <LoadingView />;
  if (!project.data) return <ErrorView error={project.error} onRetry={() => void project.refetch()} />;

  return (
    <Screen>
      <ProjectForm
        project={project.data}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id, payload });
          router.back();
        }}
      />
    </Screen>
  );
}
