import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { PeopleField } from "@/features/tasks/components/people-field";
import type { TaskPerson } from "@/features/tasks/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

import { useProjectMemberOptions } from "../hooks";
import { PROJECT_STATUSES, projectStatusLabels, type ProjectDetail, type ProjectPayload, type ProjectStatus } from "../types";

/** A picked day → midnight UTC of that day (projects have dates without a time, like the website). */
const toDay = (date: Date | null) =>
  date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : null;
const fromDay = (value?: string | null) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`) : null);

export function ProjectForm({ project, onSubmit }: { project?: ProjectDetail; onSubmit: (payload: ProjectPayload) => Promise<unknown> }) {
  const me = useCurrentUser();
  const editing = Boolean(project);
  const people = useProjectMemberOptions();
  const [name, setName] = useState(project?.name ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [members, setMembers] = useState<string[]>(project?.members.map((m) => m.id) ?? []);
  const [manager, setManager] = useState<string[]>(project?.manager ? [project.manager.id] : []);
  const [startDate, setStartDate] = useState<Date | null>(fromDay(project?.startDate));
  const [deadline, setDeadline] = useState<Date | null>(fromDay(project?.deadline));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The owner can manage a project too, and people already on it stay listed.
  const extra: TaskPerson[] = [
    ...(me.role === "owner" ? [{ id: me.id, name: `${me.name} (you)`, email: me.email, role: me.role }] : []),
    ...(project?.members ?? []),
    ...(project?.manager ? [project.manager] : []),
  ];
  const base = people.data ?? [];
  const options = [...base, ...extra.filter((e, i) => !base.some((p) => p.id === e.id) && extra.findIndex((x) => x.id === e.id) === i)];

  async function submit() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Give the project a name";
    if (startDate && deadline && deadline < startDate) found.deadline = "The deadline can't be before the start date";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const payload: ProjectPayload = {
      name: name.trim(),
      clientName: clientName.trim() || (editing ? null : undefined),
      description: description.trim() || (editing ? null : undefined),
      members,
      manager: manager[0] ?? (editing ? null : undefined),
      status,
    };
    if (startDate || editing) payload.startDate = toDay(startDate);
    if (deadline || editing) payload.deadline = toDay(deadline);
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiClientError && error.errors) setErrors(Object.fromEntries(error.errors.map((e) => [e.path, e.message])));
      Alert.alert(editing ? "Couldn't save the project" : "Couldn't create the project", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <TextField label="Name" value={name} onChangeText={setName} error={errors.name} placeholder="e.g. Website for Bilal Traders" maxLength={120} />
        <TextField label="Client" value={clientName} onChangeText={setClientName} placeholder="Who it's for" maxLength={120} />
        <TextField label="Description" value={description} onChangeText={setDescription} multiline maxLength={4000} />
      </Card>
      <Card>
        <PeopleField
          label="Members"
          options={options.filter((o) => o.role !== "owner")}
          value={members}
          onChange={setMembers}
          loading={people.isPending}
          error={errors.members}
        />
        <PeopleField
          label="Project manager"
          single
          placeholder="Nobody"
          options={options}
          value={manager}
          onChange={setManager}
          loading={people.isPending}
          error={errors.manager}
        />
        <AppText variant="small" muted>
          Members see all of the project&apos;s tasks. The manager gives tasks on it and approves finished ones.
        </AppText>
      </Card>
      <Card>
        <DateTimeField label="Start date" mode="date" value={startDate} onChange={setStartDate} />
        {startDate && <Button title="No start date" variant="ghost" icon="close" onPress={() => setStartDate(null)} style={styles.inline} />}
        <DateTimeField label="Deadline" mode="date" value={deadline} onChange={setDeadline} error={errors.deadline} />
        {deadline && <Button title="No deadline" variant="ghost" icon="close" onPress={() => setDeadline(null)} style={styles.inline} />}
        <AppText variant="label">Status</AppText>
        <View style={styles.chips}>
          {PROJECT_STATUSES.map((s) => (
            <Chip key={s} label={projectStatusLabels[s]} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>
      </Card>
      <Button title={editing ? "Save changes" : "Create project"} icon="checkmark" loading={saving} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inline: { alignSelf: "flex-start", minHeight: 36 },
});
