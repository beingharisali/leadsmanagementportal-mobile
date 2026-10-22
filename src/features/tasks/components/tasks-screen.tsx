import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useCanEdit } from "@/features/organizations/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";

import { useSetMyStatus, useTaskAccess, useTasks } from "../hooks";
import {
  TASK_STATUSES,
  partStatusLabels,
  taskStatusLabels,
  type PartStatus,
  type Task,
  type TaskListParams,
  type TaskScope,
  type TaskStatus,
} from "../types";
import { TaskRow } from "./task-row";

type View_ = "list" | "board" | "calendar";
type Due = NonNullable<TaskListParams["due"]>;
/** The API's page limit; the phone shows this many at once. */
const LIMIT = 100;

const SCOPE_LABELS: Record<TaskScope, string> = {
  mine: "Mine",
  given: "Given",
  review: "To approve",
  all: "All",
};

const DUE_LABELS: Record<Due, string> = { overdue: "Overdue", today: "Today", week: "This week", none: "No date" };

const openTask = (id: string) => router.push({ pathname: "/tasks/[id]", params: { id } });

/**
 * The Tasks screen: tasks you're on, gave, need to approve, or everything you
 * can see; as a list, a board by status or a calendar by due date.
 */
export function TasksScreen() {
  const navigation = useNavigation();
  const canEdit = useCanEdit();
  const access = useTaskAccess();
  const setMyStatus = useSetMyStatus();
  const [scope, setScope] = useState<TaskScope | null>(null);
  const [view, setView] = useState<View_>("list");
  const [column, setColumn] = useState<TaskStatus>("todo");
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [due, setDue] = useState<Due | null>(null);
  const [bin, setBin] = useState(false);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const debounced = useDebouncedValue(search.trim(), 300);

  const scopes: TaskScope[] = [
    ...(access.data?.canReceive ? (["mine"] as const) : []),
    ...(access.data?.canAssign ? (["given"] as const) : []),
    "review",
    "all",
  ];
  const activeScope = scope ?? scopes[0] ?? "all";

  const params = useMemo<TaskListParams>(() => {
    const base: TaskListParams = {
      scope: activeScope,
      search: debounced || undefined,
      status: status ? [status] : undefined,
      due: due ?? undefined,
      deleted: bin || undefined,
      limit: LIMIT,
      sort: view === "board" ? "-priority" : "dueAt",
    };
    if (view === "calendar") {
      const from = new Date(month.getFullYear(), month.getMonth(), 1);
      const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
      return { ...base, from: from.toISOString(), to: to.toISOString() };
    }
    return base;
  }, [activeScope, debounced, status, due, bin, view, month]);
  const tasks = useTasks(params, Boolean(access.data));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: bin ? "Deleted tasks" : "Tasks",
      headerRight: () => (
        <View style={styles.headerButtons}>
          <HeaderButton label={bin ? "Back" : "Recycle bin"} icon={bin ? "arrow-back" : "trash-outline"} onPress={() => setBin(!bin)} />
          {canEdit && access.data?.canAssign && !bin && (
            <HeaderButton label="New" icon="add-circle-outline" onPress={() => router.push("/tasks/new")} />
          )}
        </View>
      ),
    });
  }, [navigation, bin, canEdit, access.data?.canAssign]);

  /** Long-press: people on a task move their own part. */
  function moveMine(task: Task) {
    if (!canEdit || !task.myStatus || task.status === "done" || bin) return;
    const choices: PartStatus[] = ["todo", "in_progress", "done"];
    Alert.alert("Your part", task.title, [
      ...choices
        .filter((s) => s !== task.myStatus)
        .map((s) => ({
          text: partStatusLabels[s],
          onPress: () =>
            setMyStatus.mutate({ id: task.id, status: s }, { onError: (error) => Alert.alert("Couldn't update it", getErrorMessage(error)) }),
        })),
      { text: "Close", style: "cancel" as const },
    ]);
  }

  if (access.isPending) return <LoadingView />;
  if (access.error) return <ErrorView error={access.error} onRetry={() => void access.refetch()} />;

  const items = tasks.data?.items ?? [];
  const shown = view === "board" ? items.filter((t) => t.status === column) : items;
  const total = tasks.data?.meta.total ?? 0;

  return (
    <Screen onRefresh={() => tasks.refetch()}>
      {!bin && (
        <SegmentedControl
          segments={scopes.map((s) => ({ value: s, label: SCOPE_LABELS[s] }))}
          value={activeScope}
          onChange={setScope}
        />
      )}
      <SearchField value={search} onChangeText={setSearch} placeholder="Search tasks" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {!bin &&
          (["list", "board", "calendar"] as const).map((v) => (
            <Chip
              key={v}
              label={v === "list" ? "List" : v === "board" ? "Board" : "Calendar"}
              icon={v === "list" ? "list" : v === "board" ? "albums-outline" : "calendar-outline"}
              selected={view === v}
              onPress={() => setView(v)}
            />
          ))}
        {view !== "board" &&
          TASK_STATUSES.map((s) => (
            <Chip key={s} label={taskStatusLabels[s]} selected={status === s} onPress={() => setStatus(status === s ? null : s)} />
          ))}
        {(Object.keys(DUE_LABELS) as Due[]).map((d) => (
          <Chip key={d} label={DUE_LABELS[d]} selected={due === d} onPress={() => setDue(due === d ? null : d)} />
        ))}
      </ScrollView>

      {view === "board" && !bin && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TASK_STATUSES.map((s) => (
            <Chip
              key={s}
              label={`${taskStatusLabels[s]} · ${items.filter((t) => t.status === s).length}`}
              selected={column === s}
              onPress={() => setColumn(s)}
            />
          ))}
        </ScrollView>
      )}

      {view === "calendar" && !bin && (
        <View style={styles.month}>
          <Button title="Prev" icon="chevron-back" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
          <AppText variant="heading" style={styles.monthLabel}>
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </AppText>
          <Button title="Next" icon="chevron-forward" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </View>
      )}

      {tasks.isPending ? (
        <LoadingView />
      ) : tasks.error ? (
        <ErrorView error={tasks.error} onRetry={() => void tasks.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyView
          icon="clipboard-outline"
          title={bin ? "The recycle bin is empty" : "No tasks here"}
          message={bin ? undefined : activeScope === "mine" ? "When someone gives you a task, it shows here." : "Try another tab or filter."}
        />
      ) : view === "calendar" && !bin ? (
        <Agenda tasks={shown} />
      ) : (
        <View style={styles.list}>
          {shown.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => openTask(task.id)} onLongPress={task.myStatus ? () => moveMine(task) : undefined} />
          ))}
        </View>
      )}
      {total > items.length && (
        <AppText variant="small" muted>
          Showing the first {items.length} of {total}. Use search or the filters to narrow it down.
        </AppText>
      )}
    </Screen>
  );
}

/** A month's tasks grouped by due day. */
function Agenda({ tasks }: { tasks: Task[] }) {
  const days = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const key = new Date(task.dueAt).toDateString();
    days.set(key, [...(days.get(key) ?? []), task]);
  }
  if (days.size === 0) return <EmptyView icon="calendar-outline" title="Nothing due this month" />;
  const today = new Date().toDateString();
  return (
    <View style={styles.list}>
      {[...days.entries()].map(([key, items]) => (
        <View key={key} style={styles.day}>
          <AppText variant="label">
            {key === today ? "Today · " : ""}
            {new Date(key).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
          </AppText>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => openTask(task.id)} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: "row", alignItems: "center" },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  list: { gap: spacing.sm + 2 },
  month: { flexDirection: "row", alignItems: "center" },
  monthLabel: { flex: 1, textAlign: "center" },
  day: { gap: spacing.sm },
});
