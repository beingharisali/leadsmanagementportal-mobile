import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

import { useDepartments, type RolePayload } from "../hooks";
import {
  emptyPermissionMatrix,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  permissionActionLabels,
  permissionModuleLabels,
  type PermissionMatrix,
  type PermissionScope,
  type Role,
} from "../types";

export function RoleForm({
  role,
  onSubmit,
}: {
  role?: Role;
  onSubmit: (payload: RolePayload) => Promise<unknown>;
}) {
  const editing = !!role;
  const departments = useDepartments();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<PermissionMatrix>(role?.permissions ?? emptyPermissionMatrix());
  const [scope, setScope] = useState<PermissionScope>(role?.scope ?? "all");
  const [deptIds, setDeptIds] = useState<string[]>(role?.departments ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function toggle(module: (typeof PERMISSION_MODULES)[number], action: (typeof PERMISSION_ACTIONS)[number]) {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] },
    }));
  }

  async function submit() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Role name is required";
    if (scope === "departments" && deptIds.length === 0) found.departments = "Pick at least one department";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
        scope,
        departments: scope === "departments" ? deptIds : [],
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
        <TextField label="Role name" value={name} onChangeText={setName} error={errors.name} maxLength={60} placeholder="e.g. Dev Lead" />
        <TextField label="Description" value={description} onChangeText={setDescription} maxLength={300} />
      </Card>

      <Card>
        <AppText variant="label">Permissions</AppText>
        <AppText variant="small" muted>
          Tap to grant. Roles add access on top of a person&apos;s base role.
        </AppText>
        {PERMISSION_MODULES.map((module) => (
          <View key={module} style={styles.module}>
            <AppText weight="600">{permissionModuleLabels[module]}</AppText>
            <View style={styles.chips}>
              {PERMISSION_ACTIONS.map((action) => (
                <Chip
                  key={action}
                  label={permissionActionLabels[action]}
                  selected={permissions[module][action]}
                  onPress={() => toggle(module, action)}
                />
              ))}
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <AppText variant="label">Applies to</AppText>
        <View style={styles.chips}>
          <Chip label="Whole organization" selected={scope === "all"} onPress={() => setScope("all")} />
          <Chip label="Specific departments" selected={scope === "departments"} onPress={() => setScope("departments")} />
        </View>
        {scope === "departments" && (
          <View style={styles.module}>
            {(departments.data?.length ?? 0) === 0 ? (
              <AppText variant="small" muted>
                Create a department first.
              </AppText>
            ) : (
              <View style={styles.chips}>
                {(departments.data ?? []).map((d) => (
                  <Chip
                    key={d.id}
                    label={d.name}
                    selected={deptIds.includes(d.id)}
                    onPress={() =>
                      setDeptIds((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))
                    }
                  />
                ))}
              </View>
            )}
            {errors.departments ? (
              <AppText variant="small" color="#dc2626">
                {errors.departments}
              </AppText>
            ) : null}
          </View>
        )}
      </Card>

      <Button title={editing ? "Save changes" : "Create role"} icon="checkmark" loading={saving} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  module: { gap: spacing.sm, marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
