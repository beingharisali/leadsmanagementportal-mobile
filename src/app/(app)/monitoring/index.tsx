import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { StatusDot } from "@/features/tracking/components/tracking-rows";
import { formatDuration, formatRelative, formatTime, stateLabels, statusConfig } from "@/features/tracking/format";
import { usePresence } from "@/features/tracking/hooks";
import type { PresenceRow, PresenceStatus } from "@/features/tracking/types";
import { userRoleLabels } from "@/features/users/types";
import { getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const STATUSES: PresenceStatus[] = ["online", "idle", "offline"];

/** Owners and admins: who's online, idle or away right now, and which lead they're on. Refreshes every 15 s. */
export default function LiveStatusScreen() {
  const { colors } = useTheme();
  const presence = usePresence();
  const [everyone, setEveryone] = useState(false);
  const data = presence.data;
  const rows = (data?.users ?? []).filter((r) => everyone || r.user.role === "agent");
  const counts = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<
    PresenceStatus,
    number
  >;

  const renderItem = useCallback(
    ({ item }: { item: PresenceRow }) => <PresenceItem row={item} timeZone={data?.timeZone} />,
    [data?.timeZone],
  );

  return (
    <InfiniteList
      items={rows}
      renderItem={renderItem}
      keyExtractor={(r) => r.user.id}
      isPending={presence.isPending}
      error={presence.error}
      onRetry={() => void presence.refetch()}
      onRefresh={() => presence.refetch()}
      hasNextPage={false}
      isFetchingNextPage={false}
      fetchNextPage={() => undefined}
      header={
        <>
          <View style={styles.counts}>
            {STATUSES.map((status) => (
              <View key={status} style={[styles.count, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <StatusDot status={status} />
                <AppText variant="title">{counts[status]}</AppText>
              </View>
            ))}
          </View>
          <View style={styles.chips}>
            <Chip label="Agents only" selected={!everyone} onPress={() => setEveryone(false)} />
            <Chip label="Everyone" selected={everyone} onPress={() => setEveryone(true)} />
          </View>
          {presence.dataUpdatedAt > 0 && (
            <AppText variant="small" muted>
              Live · updated {formatTime(new Date(presence.dataUpdatedAt))}, refreshes every 15 s. Tap someone for their day.
            </AppText>
          )}
        </>
      }
      empty={
        <EmptyView
          icon="radio-outline"
          title="No team members yet"
          message="Once your agents sign in, you'll see who's online, idle or away, and which lead they're on."
        />
      }
    />
  );
}

function PresenceItem({ row, timeZone }: { row: PresenceRow; timeZone?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.user.name}, ${statusConfig[row.status].label}`}
      onPress={() => router.push({ pathname: "/monitoring/[userId]", params: { userId: row.user.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <AppText variant="small" weight="700" color={colors.primary}>
          {getInitials(row.user.name)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText weight="600" numberOfLines={1}>
          {row.user.name}
          <AppText variant="small" muted>{` · ${userRoleLabels[row.user.role]}`}</AppText>
        </AppText>
        <StatusDot status={row.status} detail={row.state === "away" ? stateLabels.away : undefined} />
        <AppText variant="small" muted>
          {row.status !== "offline"
            ? row.sessionStartedAt
              ? `Signed in ${formatTime(row.sessionStartedAt, timeZone)}`
              : ""
            : row.lastSeenAt
              ? `Last seen ${formatRelative(row.lastSeenAt)}`
              : "Never signed in"}
          {row.device ? ` · ${row.device}` : ""}
        </AppText>
        {row.currentLead && (
          <AppText
            variant="small"
            color={colors.primary}
            numberOfLines={1}
            onPress={() => router.push({ pathname: "/leads/[id]", params: { id: row.currentLead!.id } })}
          >
            On: {row.currentLead.label}
          </AppText>
        )}
      </View>
      <View style={styles.today}>
        <AppText weight="700">{formatDuration(row.today.activeMs)}</AppText>
        <AppText variant="small" muted>
          active
        </AppText>
        <AppText variant="small" muted>
          {formatDuration(row.today.idleMs)} idle
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  counts: { flexDirection: "row", gap: spacing.sm },
  count: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  avatar: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  today: { alignItems: "flex-end" },
});
