import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useProjects } from "@/features/projects/hooks";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useAssignablePeople } from "../hooks";
import {
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  recurrenceLabels,
  taskPriorityLabels,
  type RecurrenceFrequency,
  type Task,
  type TaskPayload,
  type TaskPriority,
} from "../types";
import { PeopleField } from "./people-field";

const NONE = "";

interface TaskFormProps {
  task?: Task;
  /** Starts a new task in this project */
  projectId?: string;
  onSubmit: (payload: TaskPayload) => Promise<unknown>;
}

/** New task or edit one: same fields as the website. */
export function TaskForm({ task, projectId, onSubmit }: TaskFormProps) {
  const { colors } = useTheme();
  const editing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [project, setProject] = useState(task?.project?.id ?? projectId ?? NONE);
  const [assignees, setAssignees] = useState<string[]>(task?.assignees.map((a) => a.user.id) ?? []);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueAt, setDueAt] = useState<Date | null>(task?.dueAt ? new Date(task.dueAt) : null);
  const [repeat, setRepeat] = useState<RecurrenceFrequency | "">(task?.recurrence?.frequency ?? "");
  const [interval, setInterval] = useState(String(task?.recurrence?.interval ?? 1));
  const [requiresApproval, setRequiresApproval] = useState(task?.requiresApproval ?? true);
  const [checklist, setChecklist] = useState<TaskPayload["checklist"]>(
    task?.checklist.map((i) => ({ id: i.id, text: i.text, done: i.done })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const projects = useProjects({ limit: 100, status: "active" });
  const people = useAssignablePeople(project || undefined);
  // People already on the task stay listed even if they couldn't be picked again.
  const options = [
    ...(people.data ?? []),
    ...(task?.assignees.map((a) => a.user).filter((u) => !people.data?.some((p) => p.id === u.id)) ?? []),
  ];
  const projectOptions = [
    { value: NONE, label: "No project" },
    ...(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
    ...(task?.project && !projects.data?.items.some((p) => p.id === task.project!.id)
      ? [{ value: task.project.id, label: task.project.name }]
      : []),
  ];

  async function submit() {
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = "Give the task a title";
    if (assignees.length === 0) found.assignees = "Pick at least one person";
    const every = Number(interval);
    if (repeat && (!Number.isInteger(every) || every < 1 || every > 365)) found.interval = "A number from 1 to 365";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload: TaskPayload = {
      title: title.trim(),
      description: description.trim() || (editing ? null : undefined),
      priority,
      assignees,
      project: project || (editing ? null : undefined),
      requiresApproval,
      checklist: checklist.filter((i) => i.text.trim()).map((i) => ({ ...i, text: i.text.trim() })),
      recurrence: repeat ? { frequency: repeat, interval: every } : editing ? null : undefined,
    };
    if (dueAt) payload.dueAt = dueAt.toISOString();
    else if (editing) payload.dueAt = null;

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiClientError && error.errors) {
        setErrors(Object.fromEntries(error.errors.map((e) => [e.path, e.message])));
      }
      Alert.alert(editing ? "Couldn't save the task" : "Couldn't create the task", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <TextField label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="e.g. Design the homepage" maxLength={200} />
        <TextField
          label="Details"
          value={description}
          onChangeText={setDescription}
          placeholder="What needs to be done?"
          multiline
          maxLength={10_000}
        />
        <SelectField
          label="Project"
          value={project}
          options={projectOptions}
          onChange={(next) => {
            setProject(next);
            // Project tasks go to people on the project.
            setAssignees([]);
          }}
        />
        <PeopleField
          label="Give to"
          options={options}
          value={assignees}
          onChange={setAssignees}
          error={errors.assignees}
          loading={people.isPending}
        />
        <AppText variant="small" muted>
          Each person marks their own part done.
        </AppText>
      </Card>

      <Card>
        <AppText variant="label">Priority</AppText>
        <View style={styles.chips}>
          {TASK_PRIORITIES.map((p) => (
            <Chip key={p} label={taskPriorityLabels[p]} selected={priority === p} onPress={() => setPriority(p)} />
          ))}
        </View>
        <DateTimeField label="Due" value={dueAt} onChange={setDueAt} />
        {dueAt && <Button title="No due date" variant="ghost" icon="close" onPress={() => setDueAt(null)} style={styles.inline} />}
        <AppText variant="label">Repeat</AppText>
        <View style={styles.chips}>
          <Chip label="Doesn't repeat" selected={repeat === ""} onPress={() => setRepeat("")} />
          {RECURRENCE_FREQUENCIES.map((f) => (
            <Chip key={f} label={recurrenceLabels[f]} selected={repeat === f} onPress={() => setRepeat(f)} />
          ))}
        </View>
        {repeat !== "" && (
          <TextField
            label={`Every how many ${repeat === "daily" ? "days" : repeat === "weekly" ? "weeks" : "months"}`}
            value={interval}
            onChangeText={setInterval}
            keyboardType="number-pad"
            error={errors.interval}
            hint="When it's done, the next one is made for the same people."
          />
        )}
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="label">Needs approval</AppText>
            <AppText variant="small" muted>
              When everyone is done, it waits for you (or the project manager) to approve it or send it back.
            </AppText>
          </View>
          <Switch value={requiresApproval} onValueChange={setRequiresApproval} accessibilityLabel="Needs approval" />
        </View>
      </Card>

      <Card>
        <AppText variant="label">Checklist</AppText>
        {checklist.map((item, index) => (
          <View key={item.id ?? `new-${index}`} style={styles.itemRow}>
            <View style={styles.flex}>
              <TextField
                label={`Step ${index + 1}`}
                value={item.text}
                onChangeText={(text) => setChecklist(checklist.map((c, i) => (i === index ? { ...c, text } : c)))}
                maxLength={300}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove step"
              onPress={() => setChecklist(checklist.filter((_, i) => i !== index))}
              style={styles.remove}
            >
              <Ionicons name="trash-outline" size={20} color={colors.mutedText} />
            </Pressable>
          </View>
        ))}
        <Button title="Add step" variant="secondary" icon="add" onPress={() => setChecklist([...checklist, { text: "" }])} />
      </Card>

      <Button title={editing ? "Save changes" : "Create task"} icon="checkmark" loading={saving} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  remove: { padding: spacing.sm, marginBottom: spacing.xs },
  inline: { alignSelf: "flex-start", minHeight: 36 },
});
