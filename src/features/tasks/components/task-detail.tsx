import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { useDepartmentName } from "@/features/departments/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, getInitials } from "@/lib/format";
import { spacing, radius } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import {
  describeRecurrence,
  formatDue,
  formatHistoryValue,
  historyActionLabels,
  historyFieldLabels,
  isOverdue,
  partStatusColors,
  partsDone,
  taskPriorityColors,
  taskStatusColors,
} from "../format";
import {
  useDeleteTask,
  usePurgeTask,
  useReopenTask,
  useRestoreTask,
  useReviewTask,
  useSetMyStatus,
  useTaskHistory,
  useToggleChecklistItem,
} from "../hooks";
import { partStatusLabels, taskPriorityLabels, taskStatusLabels, type PartStatus, type Task } from "../types";
import { TaskComments } from "./task-comments";
import { TaskFiles } from "./task-files";

type Tab = "comments" | "files" | "history";

/** One task: your part, approval, people, checklist, then comments, files and history. */
export function TaskDetail({ task }: { task: Task }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const canEdit = useCanEdit();
  const departmentName = useDepartmentName();
  const [tab, setTab] = useState<Tab>("comments");
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const setMyStatus = useSetMyStatus();
  const review = useReviewTask();
  const reopen = useReopenTask();
  const toggle = useToggleChecklistItem();
  const remove = useDeleteTask();
  const restore = useRestoreTask();
  const purge = usePurgeTask();
  const deleted = Boolean(task.deletedAt);
  const canWrite = canEdit && !deleted;
  const overdue = isOverdue(task);
  const parts = partsDone(task);
  const onError = (title: string) => (error: unknown) => Alert.alert(title, getErrorMessage(error));

  function showActions() {
    if (deleted) {
      return Alert.alert(task.title, "This task is in the recycle bin.", [
        { text: "Restore", onPress: () => restore.mutate(task.id, { onError: onError("Couldn't restore it") }) },
        {
          text: "Delete for good",
          style: "destructive",
          onPress: () =>
            Alert.alert("Delete this task for good?", "Its comments and files are deleted too. This can't be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => purge.mutate(task.id, { onSuccess: () => router.back(), onError: onError("Couldn't delete it") }),
              },
            ]),
        },
        { text: "Close", style: "cancel" },
      ]);
    }
    Alert.alert(task.title, undefined, [
      { text: "Edit", onPress: () => router.push({ pathname: "/tasks/[id]/edit", params: { id: task.id } }) },
      ...(task.status === "done"
        ? [{ text: "Reopen", onPress: () => reopen.mutate(task.id, { onError: onError("Couldn't reopen it") }) }]
        : []),
      {
        text: "Move to recycle bin",
        style: "destructive" as const,
        onPress: () => remove.mutate(task.id, { onSuccess: () => router.back(), onError: onError("Couldn't delete it") }),
      },
      { text: "Close", style: "cancel" as const },
    ]);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: task.canManage && canEdit ? () => <HeaderButton label="Actions" icon="ellipsis-horizontal" onPress={showActions} /> : undefined,
    });
  });

  function move(status: PartStatus) {
    setMyStatus.mutate({ id: task.id, status }, { onError: onError("Couldn't update your part") });
  }

  function decide(decision: "approve" | "reject") {
    review.mutate(
      { id: task.id, decision, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setRejecting(false);
          setNote("");
        },
        onError: onError(decision === "approve" ? "Couldn't approve it" : "Couldn't send it back"),
      },
    );
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.badges}>
          <Badge label={taskStatusLabels[task.status]} color={taskStatusColors[task.status]} />
          <Badge label={taskPriorityLabels[task.priority]} color={taskPriorityColors[task.priority]} />
          {task.recurrence && <Badge label={describeRecurrence(task.recurrence)!} color="violet" />}
          {deleted && <Badge label="In the recycle bin" color="rose" />}
        </View>
        <AppText variant="title">{task.title}</AppText>
        <AppText variant="small" color={overdue ? colors.danger : undefined} muted={!overdue}>
          {task.dueAt ? `${overdue ? "Overdue · " : "Due "}${formatDue(task.dueAt)}` : "No due date"}
        </AppText>
        <AppText variant="small" muted>
          Given by {task.createdBy?.name ?? "someone"} · {formatDateTime(task.createdAt)}
        </AppText>
        {task.project && (
          <Pressable onPress={() => router.push({ pathname: "/projects/[id]", params: { id: task.project!.id } })} style={styles.project}>
            <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
            <AppText variant="small" color={colors.primary} weight="600">
              {task.project.name}
            </AppText>
          </Pressable>
        )}
      </View>

      {task.description ? <AppText>{task.description}</AppText> : null}

      {task.rejectionNote && task.status !== "done" ? (
        <Banner tone="danger" title={`Sent back${task.reviewedBy ? ` by ${task.reviewedBy.name}` : ""}`} message={task.rejectionNote} />
      ) : null}

      {canWrite && task.myStatus && task.status !== "done" && (
        <Card>
          <AppText variant="label">Your part: {partStatusLabels[task.myStatus]}</AppText>
          <View style={styles.buttons}>
            {task.myStatus === "todo" && (
              <Button title="Start" variant="secondary" icon="play" loading={setMyStatus.isPending} onPress={() => move("in_progress")} />
            )}
            {task.myStatus !== "done" ? (
              <Button title="Mark my part done" icon="checkmark" loading={setMyStatus.isPending} onPress={() => move("done")} />
            ) : (
              <Button title="Not done yet" variant="secondary" icon="arrow-undo" loading={setMyStatus.isPending} onPress={() => move("in_progress")} />
            )}
          </View>
        </Card>
      )}

      {canWrite && task.canReview && (
        <Card>
          <AppText weight="600">Everyone has finished. Approve it, or send it back with a note.</AppText>
          {rejecting ? (
            <>
              <TextField label="What needs to change?" value={note} onChangeText={setNote} multiline autoFocus maxLength={1000} />
              <View style={styles.buttons}>
                <Button title="Cancel" variant="ghost" onPress={() => setRejecting(false)} />
                <Button title="Send back" variant="danger" disabled={!note.trim()} loading={review.isPending} onPress={() => decide("reject")} />
              </View>
            </>
          ) : (
            <View style={styles.buttons}>
              <Button title="Approve" icon="thumbs-up" loading={review.isPending} onPress={() => decide("approve")} />
              <Button title="Send back" variant="secondary" icon="thumbs-down" onPress={() => setRejecting(true)} />
            </View>
          )}
        </Card>
      )}

      <Card>
        <AppText variant="heading">
          People <AppText muted>· {parts.done} of {parts.total} done</AppText>
        </AppText>
        {task.assignees.map((a) => (
          <View key={a.user.id} style={styles.person}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="small" weight="700" color={colors.primary}>
                {getInitials(a.user.name)}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText>{a.user.name}</AppText>
              <AppText variant="small" muted>
                {departmentName(a.user.department)}
              </AppText>
            </View>
            <Badge label={partStatusLabels[a.status]} color={partStatusColors[a.status]} />
          </View>
        ))}
      </Card>

      {task.checklist.length > 0 && (
        <Card>
          <AppText variant="heading">
            Checklist <AppText muted>· {task.checklist.filter((i) => i.done).length} of {task.checklist.length}</AppText>
          </AppText>
          {task.checklist.map((item) => {
            const canTick = canWrite && (task.myStatus !== null || task.canManage);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done, disabled: !canTick }}
                disabled={!canTick || toggle.isPending}
                onPress={() => toggle.mutate({ id: task.id, itemId: item.id, done: !item.done }, { onError: onError("Couldn't update the checklist") })}
                style={styles.item}
              >
                <Ionicons
                  name={item.done ? "checkbox" : "square-outline"}
                  size={22}
                  color={item.done ? colors.success : colors.mutedText}
                />
                <AppText style={[styles.flex, item.done && styles.done]} muted={item.done}>
                  {item.text}
                  {item.done && item.doneBy ? ` (${item.doneBy.name})` : ""}
                </AppText>
              </Pressable>
            );
          })}
        </Card>
      )}

      <SegmentedControl
        segments={[
          { value: "comments", label: "Comments" },
          { value: "files", label: "Files" },
          { value: "history", label: "History" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Card>
        {tab === "comments" ? (
          <TaskComments taskId={task.id} canWrite={canWrite} canManage={task.canManage} />
        ) : tab === "files" ? (
          <TaskFiles taskId={task.id} canWrite={canWrite} canManage={task.canManage} />
        ) : (
          <TaskHistory taskId={task.id} />
        )}
      </Card>
    </>
  );
}

function TaskHistory({ taskId }: { taskId: string }) {
  const history = useTaskHistory(taskId);
  if (history.isPending) return <AppText muted>Loading…</AppText>;
  const entries = history.data ?? [];
  if (entries.length === 0) return <AppText muted>Nothing yet.</AppText>;
  return (
    <View style={styles.history}>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.historyItem}>
          <AppText variant="small">
            <AppText variant="small" weight="600">
              {entry.actor?.name ?? "Someone"}
            </AppText>{" "}
            {historyActionLabels[entry.action] ?? entry.action}
            <AppText variant="small" muted>
              {" "}
              · {formatDateTime(entry.createdAt)}
            </AppText>
          </AppText>
          {entry.message ? (
            <AppText variant="small" muted>
              {entry.message}
            </AppText>
          ) : null}
          {entry.changes.map((change, index) => (
            <AppText key={index} variant="small" muted>
              {historyFieldLabels[change.field] ?? change.field}: {formatHistoryValue(change.field, change.from)} →{" "}
              {formatHistoryValue(change.field, change.to)}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs + 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  project: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  done: { textDecorationLine: "line-through" },
  history: { gap: spacing.md },
  historyItem: { gap: 2 },
});
