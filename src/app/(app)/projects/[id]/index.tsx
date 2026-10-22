import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useDepartmentName } from "@/features/departments/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { ProjectProgressView, projectStatusColors } from "@/features/projects/components/project-card";
import { useDeleteProject, useProject } from "@/features/projects/hooks";
import { projectStatusLabels } from "@/features/projects/types";
import { TaskRow } from "@/features/tasks/components/task-row";
import { useTasks } from "@/features/tasks/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { spacing } from "@/theme/colors";

/** A project: details, people, progress and every task on it. */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const canEdit = useCanEdit();
  const departmentName = useDepartmentName();
  const project = useProject(id);
  const tasks = useTasks({ project: id, scope: "all", limit: 100, sort: "dueAt" });
  const remove = useDeleteProject();
  const data = project.data;

  useLayoutEffect(() => {
    function showActions() {
      if (!data) return;
      Alert.alert(data.name, undefined, [
        { text: "Edit", onPress: () => router.push({ pathname: "/projects/[id]/edit", params: { id } }) },
        {
          text: "Move to recycle bin",
          style: "destructive",
          onPress: () =>
            Alert.alert("Move this project to the recycle bin?", "Its tasks go with it. You can restore both later.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Move",
                style: "destructive",
                onPress: () =>
                  remove.mutate(id, {
                    onSuccess: () => router.back(),
                    onError: (e) => Alert.alert("Couldn't delete it", getErrorMessage(e)),
                  }),
              },
            ]),
        },
        { text: "Close", style: "cancel" },
      ]);
    }
    navigation.setOptions({
      title: data?.name ?? "",
      headerRight:
        data?.canManage && canEdit ? () => <HeaderButton label="Actions" icon="ellipsis-horizontal" onPress={showActions} /> : undefined,
    });
  }, [navigation, data, canEdit, id, remove]);

  if (project.isPending) return <LoadingView />;
  if (!data) return <ErrorView error={project.error} onRetry={() => void project.refetch()} />;

  const people = [...(data.manager ? [data.manager] : []), ...data.members.filter((m) => m.id !== data.manager?.id)];
  const items = tasks.data?.items ?? [];

  return (
    <Screen onRefresh={() => Promise.all([project.refetch(), tasks.refetch()])}>
      <View style={styles.header}>
        <Badge label={projectStatusLabels[data.status]} color={projectStatusColors[data.status]} />
        <AppText variant="small" muted>
          {[
            data.clientName && `Client: ${data.clientName}`,
            data.startDate && `Started ${formatDate(data.startDate)}`,
            data.deadline && `Deadline ${formatDate(data.deadline)}`,
          ]
            .filter(Boolean)
            .join(" · ") || `Created by ${data.createdBy?.name ?? "someone"}`}
        </AppText>
      </View>
      <Card>
        <ProjectProgressView progress={data.progress} />
        {data.description ? <AppText>{data.description}</AppText> : null}
      </Card>
      <Card>
        <AppText variant="heading">People</AppText>
        {people.length === 0 ? (
          <AppText muted>Nobody yet.</AppText>
        ) : (
          people.map((person) => (
            <View key={person.id} style={styles.person}>
              <AppText style={styles.flex}>{person.name}</AppText>
              <AppText variant="small" muted>
                {person.id === data.manager?.id ? "Project manager" : departmentName(person.department)}
              </AppText>
            </View>
          ))
        )}
      </Card>
      <View style={styles.tasksHeader}>
        <AppText variant="heading" style={styles.flex}>
          Tasks
        </AppText>
        {canEdit && data.canAddTasks && (
          <Button
            title="Add task"
            icon="add"
            variant="secondary"
            onPress={() => router.push({ pathname: "/tasks/new", params: { projectId: id } })}
          />
        )}
      </View>
      {tasks.isPending ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <EmptyView icon="clipboard-outline" title="No tasks on this project yet" />
      ) : (
        <View style={styles.list}>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs + 2, alignItems: "flex-start" },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tasksHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  list: { gap: spacing.sm + 2 },
});
