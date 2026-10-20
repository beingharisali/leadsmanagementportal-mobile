import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ListRow } from "@/components/ui/list-row";
import { useAssignableUsers } from "@/features/users/hooks";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { spacing } from "@/theme/colors";

import { useDepartments, useRoles } from "../hooks";

export interface TeamAssignmentValue {
  departments: string[];
  reportsTo: string | null;
  customRoles: string[];
}

/** Departments, reporting line and custom roles for a person. Shown only with Team Workspace. */
export function TeamAssignmentSection({
  value,
  onChange,
  excludeUserId,
}: {
  value: TeamAssignmentValue;
  onChange: (next: TeamAssignmentValue) => void;
  excludeUserId?: string;
}) {
  const departments = useDepartments();
  const roles = useRoles();
  const users = useAssignableUsers();
  const [picking, setPicking] = useState(false);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const managerName = value.reportsTo
    ? (users.data ?? []).find((u) => u.id === value.reportsTo)?.name ?? "Selected"
    : "Nobody";

  return (
    <Card>
      <AppText variant="label">Team Workspace</AppText>

      <View style={styles.group}>
        <AppText variant="small" muted>
          Departments
        </AppText>
        {(departments.data?.length ?? 0) === 0 ? (
          <AppText variant="small" muted>
            No departments yet.
          </AppText>
        ) : (
          <View style={styles.chips}>
            {(departments.data ?? []).map((d) => (
              <Chip
                key={d.id}
                label={d.name}
                selected={value.departments.includes(d.id)}
                onPress={() => onChange({ ...value, departments: toggle(value.departments, d.id) })}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.group}>
        <AppText variant="small" muted>
          Reports to
        </AppText>
        <ListRow icon="git-network-outline" title={managerName} onPress={() => setPicking(true)} />
      </View>

      <View style={styles.group}>
        <AppText variant="small" muted>
          Custom roles
        </AppText>
        {(roles.data?.length ?? 0) === 0 ? (
          <AppText variant="small" muted>
            No custom roles yet.
          </AppText>
        ) : (
          <View style={styles.chips}>
            {(roles.data ?? []).map((r) => (
              <Chip
                key={r.id}
                label={r.name}
                selected={value.customRoles.includes(r.id)}
                onPress={() => onChange({ ...value, customRoles: toggle(value.customRoles, r.id) })}
              />
            ))}
          </View>
        )}
      </View>

      <UserPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Reports to"
        value={value.reportsTo}
        onSelect={(id) => {
          onChange({ ...value, reportsTo: id && id !== excludeUserId ? id : null });
          setPicking(false);
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm, marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
