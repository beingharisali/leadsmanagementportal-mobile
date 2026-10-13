import { router, Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { ListRow } from "@/components/ui/list-row";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useCanEdit } from "@/features/organizations/hooks";
import { InviteSheet } from "@/features/team/components/invite-sheet";
import { OffboardSheet } from "@/features/team/components/offboard-sheet";
import { PendingInvitations } from "@/features/team/components/pending-invitations";
import { ShiftSheet } from "@/features/team/components/shift-sheet";
import { useViewAsControls } from "@/features/tracking/view-as";
import { useUpdateUser, useUsers, type UserListParams } from "@/features/users/hooks";
import { userRoleLabels, type User } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime, getInitials } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const ROLE_FILTERS: { value: UserListParams["role"]; label: string }[] = [
  { value: undefined, label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admins" },
  { value: "agent", label: "Agents" },
];
const STATUS_FILTERS: { value: UserListParams["status"]; label: string }[] = [
  { value: undefined, label: "Any status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** Owners and admins: invite agents, update their details and control who can sign in. */
export default function TeamScreen() {
  const me = useCurrentUser();
  const canEdit = useCanEdit();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserListParams["role"]>();
  const [status, setStatus] = useState<UserListParams["status"]>();
  const debouncedSearch = useDebouncedValue(search.trim());
  const users = useUsers({ search: debouncedSearch || undefined, role, status });
  const update = useUpdateUser();
  const viewAs = useViewAsControls();
  const hasMonitoring = me.organization?.features.includes("monitoring") ?? false;

  const [inviting, setInviting] = useState(false);
  const [actionsFor, setActionsFor] = useState<User | null>(null);
  const [shiftFor, setShiftFor] = useState<User | null>(null);
  const [offboarding, setOffboarding] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  function toggleActive(user: User) {
    const activate = !user.isActive;
    Alert.alert(
      activate ? `Activate ${user.name}?` : `Deactivate ${user.name}?`,
      activate
        ? "They'll be able to sign in again."
        : "They're signed out at once and can't sign in. Their leads stay assigned to them; use Offboard to hand them over.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: activate ? "Activate" : "Deactivate",
          style: activate ? "default" : "destructive",
          onPress: () =>
            update.mutate(
              { id: user.id, payload: { isActive: activate } },
              { onError: (error) => Alert.alert("Couldn't change their access", getErrorMessage(error)) },
            ),
        },
      ],
    );
  }

  /** Close the menu, then open what was picked (two sheets can't be open at once). */
  function then(action: () => void) {
    setActionsFor(null);
    setTimeout(action, 350);
  }

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <MemberRow user={item} isMe={item.id === me.id} onPress={() => setActionsFor(item)} />
    ),
    [me.id],
  );

  const target = actionsFor;
  // Only the owner edits the owner's account.
  const canManage = (u: User) => canEdit && (u.role !== "owner" || u.id === me.id);
  const filtered = !!debouncedSearch || !!role || !!status;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: canEdit
            ? () => (
                <View style={styles.headerButtons}>
                  <HeaderButton label="Add member" icon="person-add-outline" onPress={() => router.push("/team/new")} />
                  <HeaderButton label="Invite by email" icon="mail-outline" onPress={() => setInviting(true)} />
                </View>
              )
            : undefined,
        }}
      />
      <InfiniteList
        items={flattenPages(users.data)}
        renderItem={renderItem}
        keyExtractor={(u) => u.id}
        isPending={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        onRefresh={() => users.refetch()}
        hasNextPage={users.hasNextPage}
        isFetchingNextPage={users.isFetchingNextPage}
        fetchNextPage={() => void users.fetchNextPage()}
        header={
          <>
            <PendingInvitations canWrite={canEdit} />
            <SearchField value={search} onChangeText={setSearch} placeholder="Search name, email, phone" />
            <View style={styles.chips}>
              {ROLE_FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={role === f.value} onPress={() => setRole(f.value)} />
              ))}
            </View>
            <View style={styles.chips}>
              {STATUS_FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />
              ))}
            </View>
          </>
        }
        empty={
          <EmptyView
            icon="people-outline"
            title="No team members found"
            message={filtered ? "Try another search or clear the filters." : "Invite your agents by email so they can start working leads."}
          />
        }
      />

      <Sheet open={!!target} onClose={() => setActionsFor(null)} title={target?.name ?? ""} subtitle={target?.email}>
        {target && (
          <View>
            {canManage(target) && (
              <ListRow
                icon="pencil"
                title="Edit details"
                subtitle="Name, email, phone, role, password"
                onPress={() => then(() => router.push({ pathname: "/team/[id]", params: { id: target.id } }))}
              />
            )}
            {hasMonitoring && (
              <ListRow
                icon="pulse-outline"
                title="View activity"
                subtitle="Their day, timesheet and sign-ins"
                onPress={() =>
                  then(() => router.push({ pathname: "/monitoring/[userId]", params: { userId: target.id } }))
                }
              />
            )}
            {hasMonitoring && target.role === "agent" && target.isActive && (
              <ListRow
                icon="eye-outline"
                title="View as agent"
                subtitle="See the app exactly as they do (read-only)"
                onPress={() => then(() => void viewAs.start({ id: target.id, name: target.name }))}
              />
            )}
            {target.isActive && canManage(target) && (
              <ListRow icon="time-outline" title="Working hours" onPress={() => then(() => setShiftFor(target))} />
            )}
            {canEdit && target.isActive && target.id !== me.id && target.role !== "owner" && (
              <ListRow
                icon="exit-outline"
                title="Offboard…"
                subtitle="Hand over their leads and deactivate"
                onPress={() => then(() => setOffboarding(target))}
              />
            )}
            {canEdit && target.id !== me.id && target.role !== "owner" && (
              <ListRow
                icon={target.isActive ? "person-remove-outline" : "person-add-outline"}
                title={target.isActive ? "Deactivate" : "Activate"}
                destructive={target.isActive}
                onPress={() => then(() => toggleActive(target))}
              />
            )}
            {canEdit && target.id !== me.id && target.role !== "owner" && (
              <ListRow
                icon="trash-outline"
                title="Delete permanently…"
                subtitle="Remove them for good and free their email"
                destructive
                onPress={() => then(() => setDeleting(target))}
              />
            )}
          </View>
        )}
      </Sheet>
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
      <ShiftSheet user={shiftFor} onClose={() => setShiftFor(null)} />
      <OffboardSheet user={offboarding} onClose={() => setOffboarding(null)} />
      <OffboardSheet user={deleting} remove onClose={() => setDeleting(null)} />
    </>
  );
}

function MemberRow({ user, isMe, onPress }: { user: User; isMe: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        !user.isActive && styles.inactive,
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <AppText variant="small" weight="700" color={colors.primary}>
          {getInitials(user.name)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText weight="600" numberOfLines={1}>
          {user.name}
          {isMe ? <AppText variant="small" muted>{" (you)"}</AppText> : null}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {user.email}
          {user.phone ? ` · ${user.phone}` : ""}
        </AppText>
        <View style={styles.badges}>
          <Badge label={userRoleLabels[user.role]} color={user.role === "agent" ? "slate" : "indigo"} />
          <Badge label={user.isActive ? "Active" : "Inactive"} color={user.isActive ? "emerald" : "slate"} />
          {user.shift && <Badge label={`${user.shift.start}–${user.shift.end}`} color="sky" />}
        </View>
        <AppText variant="small" muted>
          Last sign-in: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  headerButtons: { flexDirection: "row", alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  inactive: { opacity: 0.6 },
  avatar: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
