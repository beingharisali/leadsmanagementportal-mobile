import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useCanEdit } from "@/features/organizations/hooks";
import { ProjectCard } from "@/features/projects/components/project-card";
import { usePurgeProject, useProjects, useRestoreProject } from "@/features/projects/hooks";
import { useTaskAccess } from "@/features/tasks/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";

/** The projects you're on, manage or created (every one, for the owner). */
export default function ProjectsScreen() {
  const navigation = useNavigation();
  const canEdit = useCanEdit();
  const access = useTaskAccess();
  const [bin, setBin] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const projects = useProjects({ limit: 100, search: debounced || undefined, deleted: bin || undefined });
  const restore = useRestoreProject();
  const purge = usePurgeProject();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: bin ? "Deleted projects" : "Projects",
      headerRight: () => (
        <View style={styles.headerButtons}>
          <HeaderButton label={bin ? "Back" : "Recycle bin"} icon={bin ? "arrow-back" : "trash-outline"} onPress={() => setBin(!bin)} />
          {canEdit && access.data?.canAssign && !bin && (
            <HeaderButton label="New" icon="add-circle-outline" onPress={() => router.push("/projects/new")} />
          )}
        </View>
      ),
    });
  }, [navigation, bin, canEdit, access.data?.canAssign]);

  function confirmPurge(id: string) {
    Alert.alert("Delete this project for good?", "Its tasks, comments and files are deleted too. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => purge.mutate(id, { onError: (e) => Alert.alert("Couldn't delete it", getErrorMessage(e)) }),
      },
    ]);
  }

  const items = projects.data?.items ?? [];

  return (
    <Screen onRefresh={() => projects.refetch()}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search by project or client" />
      {projects.isPending ? (
        <LoadingView />
      ) : projects.error ? (
        <ErrorView error={projects.error} onRetry={() => void projects.refetch()} />
      ) : items.length === 0 ? (
        <EmptyView
          icon="folder-open-outline"
          title={bin ? "The recycle bin is empty" : "No projects yet"}
          message={bin ? undefined : "When you're added to a project, it shows here."}
        />
      ) : bin ? (
        <View style={styles.list}>
          {items.map((project) => (
            <Card key={project.id}>
              <AppText weight="600">{project.name}</AppText>
              <AppText variant="small" muted>
                Restoring it brings its {project.progress.total} {project.progress.total === 1 ? "task" : "tasks"} back too.
              </AppText>
              {canEdit && (
                <View style={styles.buttons}>
                  <Button
                    title="Restore"
                    variant="secondary"
                    icon="refresh"
                    onPress={() => restore.mutate(project.id, { onError: (e) => Alert.alert("Couldn't restore it", getErrorMessage(e)) })}
                  />
                  <Button title="Delete for good" variant="ghost" icon="trash-outline" onPress={() => confirmPurge(project.id)} />
                </View>
              )}
            </Card>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => router.push({ pathname: "/projects/[id]", params: { id: project.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: "row", alignItems: "center" },
  list: { gap: spacing.sm + 2 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
