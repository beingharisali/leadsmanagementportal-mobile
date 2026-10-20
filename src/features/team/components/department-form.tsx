import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { TextField } from "@/components/ui/text-field";
import { ColorPicker } from "@/features/settings/components/color-picker";
import type { ColorName } from "@/features/customization/types";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

import type { DepartmentPayload } from "../hooks";
import type { Department } from "../types";

export function DepartmentForm({
  department,
  onSubmit,
}: {
  department?: Department;
  onSubmit: (payload: DepartmentPayload) => Promise<unknown>;
}) {
  const editing = !!department;
  const users = useAssignableUsers();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [color, setColor] = useState<ColorName>(department?.color ?? "slate");
  const [teamLead, setTeamLead] = useState<string | null>(department?.teamLead?.id ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const leadName = teamLead
    ? (users.data ?? []).find((u) => u.id === teamLead)?.name ?? department?.teamLead?.name ?? "Selected"
    : "No team lead";

  async function submit() {
    if (name.trim().length < 2) {
      setErrors({ name: "Department name is required" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        teamLead,
      });
    } catch (error) {
      const apiErrors =
        error instanceof ApiClientError && error.errors
          ? Object.fromEntries(error.errors.map((e) => [e.path, e.message]))
          : {};
      setErrors(apiErrors);
      Alert.alert(editing ? "Couldn't save" : "Couldn't create", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <TextField label="Name" value={name} onChangeText={setName} error={errors.name} maxLength={60} />
          </View>
          <View style={styles.colorBox}>
            <AppText variant="label">Colour</AppText>
            <ColorPicker value={color} onChange={setColor} label="Department colour" />
          </View>
        </View>
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={300}
        />
        <View style={styles.group}>
          <AppText variant="label">Team lead</AppText>
          <ListRow icon="person-outline" title={leadName} onPress={() => setPicking(true)} />
        </View>
      </Card>
      <Button title={editing ? "Save changes" : "Create department"} icon="checkmark" loading={saving} onPress={() => void submit()} />

      <UserPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Team lead"
        value={teamLead}
        onSelect={(id) => {
          setTeamLead(id);
          setPicking(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  colorBox: { gap: spacing.sm, alignItems: "center" },
  group: { gap: spacing.sm, marginTop: spacing.md },
});
