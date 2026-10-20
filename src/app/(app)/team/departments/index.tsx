import { router, Stack } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useCanEdit } from "@/features/organizations/hooks";
import { useDeleteDepartment, useDepartments } from "@/features/team/hooks";
import type { Department } from "@/features/team/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Departments: group the team into Sales, Development, Design, and so on. */
export default function DepartmentsScreen() {
  const me = useCurrentUser();
  const canEdit = useCanEdit();
  const enabled = me.organization?.features.includes("teamWorkspace") ?? false;
  const departments = useDepartments(enabled);
  const remove = useDeleteDepartment();

  if (!enabled) {
    return (
      <Screen>
        <EmptyView
          icon="lock-closed-outline"
          title="Team Workspace isn't enabled"
          message="Contact GetCloseWise to turn on departments, roles and permissions for your company."
        />
      </Screen>
    );
  }

  function confirmDelete(department: Department) {
    Alert.alert(
      `Delete ${department.name}?`,
      "People in it will be removed, and any role scoped to it loses that scope. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            remove.mutate(department.id, {
              onError: (error) => Alert.alert("Couldn't delete", getErrorMessage(error)),
            }),
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: canEdit
            ? () => <HeaderButton label="New department" icon="add" onPress={() => router.push("/team/departments/new")} />
            : undefined,
        }}
      />
      {departments.isPending ? (
        <LoadingView />
      ) : departments.error ? (
        <ErrorView error={departments.error} onRetry={() => void departments.refetch()} />
      ) : (
        <Screen>
          {(departments.data?.length ?? 0) === 0 ? (
            <EmptyView
              icon="people-circle-outline"
              title="No departments yet"
              message="Create departments like Sales, Development or Design to organize your team."
            />
          ) : (
            <View style={styles.list}>
              {(departments.data ?? []).map((department) => (
                <DepartmentRow
                  key={department.id}
                  department={department}
                  canEdit={canEdit}
                  onPress={() =>
                    canEdit && router.push({ pathname: "/team/departments/[id]", params: { id: department.id } })
                  }
                  onLongPress={() => canEdit && confirmDelete(department)}
                />
              ))}
            </View>
          )}
        </Screen>
      )}
    </>
  );
}

function DepartmentRow({
  department,
  canEdit,
  onPress,
  onLongPress,
}: {
  department: Department;
  canEdit: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!canEdit}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Badge label={department.name} color={department.color} dot />
          <Badge label={`${department.memberCount ?? 0} member${department.memberCount === 1 ? "" : "s"}`} color="slate" />
        </View>
        {department.description ? (
          <AppText variant="small" muted numberOfLines={1}>
            {department.description}
          </AppText>
        ) : null}
        <AppText variant="small" muted>
          Lead: {department.teamLead ? department.teamLead.name : "—"}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  flex: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, alignItems: "center" },
});
