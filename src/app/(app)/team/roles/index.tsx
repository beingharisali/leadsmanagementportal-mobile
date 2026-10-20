import { router, Stack } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useDeleteRole, useRoles } from "@/features/team/hooks";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  permissionModuleLabels,
  type Role,
} from "@/features/team/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

function summarize(role: Role) {
  const parts = PERMISSION_MODULES.flatMap((module) => {
    const actions = PERMISSION_ACTIONS.filter((action) => role.permissions[module]?.[action]);
    return actions.length ? [`${permissionModuleLabels[module]}: ${actions.join(", ")}`] : [];
  });
  return parts.length ? parts.join(" · ") : "No permissions yet";
}

/** Custom roles & permissions. The owner creates them; admins can view. */
export default function RolesScreen() {
  const me = useCurrentUser();
  const isOwner = me.role === "owner";
  const enabled = me.organization?.features.includes("teamWorkspace") ?? false;
  const roles = useRoles(enabled);
  const remove = useDeleteRole();

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

  function confirmDelete(role: Role) {
    Alert.alert(`Delete ${role.name}?`, "Everyone with this role loses the access it granted. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(role.id, { onError: (error) => Alert.alert("Couldn't delete", getErrorMessage(error)) }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: isOwner
            ? () => <HeaderButton label="New role" icon="add" onPress={() => router.push("/team/roles/new")} />
            : undefined,
        }}
      />
      {roles.isPending ? (
        <LoadingView />
      ) : roles.error ? (
        <ErrorView error={roles.error} onRetry={() => void roles.refetch()} />
      ) : (
        <Screen>
          {(roles.data?.length ?? 0) === 0 ? (
            <EmptyView
              icon="shield-checkmark-outline"
              title="No custom roles yet"
              message={isOwner ? "Create roles like “Dev Lead” or “Designer” to grant specific access." : "Your owner hasn't created any roles yet."}
            />
          ) : (
            <View style={styles.list}>
              {(roles.data ?? []).map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  canEdit={isOwner}
                  onPress={() => isOwner && router.push({ pathname: "/team/roles/[id]", params: { id: role.id } })}
                  onLongPress={() => isOwner && confirmDelete(role)}
                />
              ))}
            </View>
          )}
        </Screen>
      )}
    </>
  );
}

function RoleRow({
  role,
  canEdit,
  onPress,
  onLongPress,
}: {
  role: Role;
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
          <AppText weight="600">{role.name}</AppText>
          <Badge label={role.scope === "all" ? "Whole org" : `${role.departments.length} dept(s)`} color="indigo" />
          <Badge label={`${role.memberCount ?? 0}`} color="slate" />
        </View>
        <AppText variant="small" muted numberOfLines={2}>
          {summarize(role)}
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
