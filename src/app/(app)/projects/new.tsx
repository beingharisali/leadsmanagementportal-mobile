import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProjectForm } from "@/features/projects/components/project-form";
import { useCreateProject } from "@/features/projects/hooks";

export default function NewProjectScreen() {
  const create = useCreateProject();
  return (
    <Screen>
      <ProjectForm
        onSubmit={async (payload) => {
          const project = await create.mutateAsync(payload);
          router.replace({ pathname: "/projects/[id]", params: { id: project.id } });
        }}
      />
    </Screen>
  );
}
