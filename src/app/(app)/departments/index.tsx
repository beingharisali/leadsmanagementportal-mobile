import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useCreateDepartment, useDepartmentPeople, useDepartments } from "@/features/departments/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { PeopleField } from "@/features/tasks/components/people-field";
import { useTaskAccess } from "@/features/tasks/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/**
 * The company's departments. Everyone but the owner is in one; a department's
 * head sees every task of the people in it. Tap one to see its people.
 */
export default function DepartmentsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const canEdit = useCanEdit();
  const access = useTaskAccess();
  const departments = useDepartments();
  const canManage = canEdit && Boolean(access.data?.canManageDepartments);
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canManage ? () => <HeaderButton label="New" icon="add-circle-outline" onPress={() => setCreating(true)} /> : undefined,
    });
  }, [navigation, canManage]);

  if (departments.isPending) return <LoadingView />;
  if (departments.error) return <ErrorView error={departments.error} onRetry={() => void departments.refetch()} />;

  return (
    <Screen onRefresh={() => departments.refetch()}>
      <AppText muted>Each person works in one department. A department&apos;s head sees every task of the people in it.</AppText>
      <View style={styles.list}>
        {(departments.data ?? []).map((department) => (
          <Pressable
            key={department.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/departments/[id]", params: { id: department.id } })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            <View style={styles.flex}>
              <View style={styles.title}>
                <AppText weight="600">{department.name}</AppText>
                {department.kind && <Badge label="Built in" color="indigo" />}
              </View>
              <AppText variant="small" muted>
                {department.memberCount} {department.memberCount === 1 ? "person" : "people"} · Head: {department.head?.name ?? "nobody"}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
      <CreateSheet open={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateDepartment();
  const people = useDepartmentPeople(open);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [head, setHead] = useState<string[]>([]);

  function save() {
    if (name.trim().length < 2) return Alert.alert("Give the department a name");
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, head: head[0] ?? null },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setHead([]);
          onClose();
        },
        onError: (error) => Alert.alert("Couldn't create it", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New department"
      footer={<Button title="Create" icon="checkmark" loading={create.isPending} onPress={save} />}
    >
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Development" maxLength={60} autoCapitalize="words" />
      <TextField label="Description" value={description} onChangeText={setDescription} maxLength={300} />
      <PeopleField
        label="Head"
        single
        placeholder="Nobody"
        options={(people.data ?? []).filter((p) => p.canHead)}
        value={head}
        onChange={setHead}
        loading={people.isPending}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  title: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
});
