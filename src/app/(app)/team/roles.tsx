import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import {
  useCreateMemberRole,
  useDeleteMemberRole,
  useMemberRoles,
  useRenameMemberRole,
  type MemberRole,
} from "@/features/member-roles/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { hasTeamAccess } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/**
 * Custom roles for people who don't work leads (Developer, Designer…). Tap a
 * role to rename or delete it. Owner, or admins given team access.
 */
export default function TeamRolesScreen() {
  const me = useCurrentUser();
  const canManage = useCanEdit() && hasTeamAccess(me);
  const roles = useMemberRoles();
  const create = useCreateMemberRole();
  const remove = useDeleteMemberRole();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<MemberRole | null>(null);

  if (roles.isPending) return <LoadingView />;
  if (roles.error) return <ErrorView error={roles.error} onRetry={() => void roles.refetch()} />;

  function add() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return Alert.alert("Give the role a name");
    create.mutate(trimmed, {
      onSuccess: () => setName(""),
      onError: (error) => Alert.alert("Couldn't add the role", getErrorMessage(error)),
    });
  }

  function showActions(role: MemberRole) {
    if (!canManage || role.isDefault) return;
    Alert.alert(role.name, `${role.memberCount} ${role.memberCount === 1 ? "person has" : "people have"} this role.`, [
      { text: "Rename", onPress: () => setRenaming(role) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            `Delete "${role.name}"?`,
            role.memberCount ? "Everyone with this role moves to General Team." : "Nobody has this role.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () =>
                  remove.mutate(role.id, {
                    onError: (error) => Alert.alert("Couldn't delete the role", getErrorMessage(error)),
                  }),
              },
            ],
          ),
      },
      { text: "Close", style: "cancel" },
    ]);
  }

  return (
    <Screen onRefresh={() => roles.refetch()}>
      <AppText muted>
        Roles for people who don&apos;t work leads. Everyone you invite joins as General Team; change their role on
        the Team screen.
      </AppText>
      <View style={styles.list}>
        {(roles.data ?? []).map((role) => (
          <RoleRow key={role.id} role={role} onPress={() => showActions(role)} />
        ))}
      </View>
      {canManage && (
        <Card>
          <TextField
            label="New role"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Designer"
            autoCapitalize="words"
            maxLength={60}
            onSubmitEditing={add}
          />
          <Button title="Add role" icon="add" loading={create.isPending} onPress={add} />
        </Card>
      )}
      <RenameSheet role={renaming} onClose={() => setRenaming(null)} />
    </Screen>
  );
}

function RoleRow({ role, onPress }: { role: MemberRole; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={role.isDefault ? undefined : "Rename or delete"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && !role.isDefault && { backgroundColor: colors.primarySoft },
      ]}
    >
      <AppText weight="600" style={styles.flex} numberOfLines={1}>
        {role.name}
      </AppText>
      {role.isDefault && <Badge label="Default for invites" color="indigo" />}
      <AppText variant="small" muted>
        {role.memberCount} {role.memberCount === 1 ? "person" : "people"}
      </AppText>
    </Pressable>
  );
}

function RenameSheet({ role, onClose }: { role: MemberRole | null; onClose: () => void }) {
  const rename = useRenameMemberRole();
  const [name, setName] = useState("");
  const [forId, setForId] = useState<string | null>(null);
  // Start from the role's current name each time the sheet opens for one.
  if (role && role.id !== forId) {
    setForId(role.id);
    setName(role.name);
  }

  function save() {
    if (!role) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) return Alert.alert("Give the role a name");
    rename.mutate(
      { id: role.id, name: trimmed },
      {
        onSuccess: () => {
          setForId(null);
          onClose();
        },
        onError: (error) => Alert.alert("Couldn't rename the role", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={!!role}
      onClose={() => {
        setForId(null);
        onClose();
      }}
      title="Rename role"
      footer={<Button title="Save" icon="checkmark" loading={rename.isPending} onPress={save} />}
    >
      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} autoFocus />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
});
