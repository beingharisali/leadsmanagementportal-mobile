import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { useCallSummary } from "@/features/calls/hooks";
import { formatDuration } from "@/features/calls/types";
import { FollowUpRow } from "@/features/follow-ups/components/follow-up-row";
import { useFollowUpActions } from "@/features/follow-ups/components/use-follow-up-actions";
import { localDayBounds } from "@/features/follow-ups/format";
import { useFollowUps, useFollowUpSummary } from "@/features/follow-ups/hooks";
import type { FollowUpView } from "@/features/follow-ups/types";
import { flattenPages } from "@/lib/infinite";
import { linkParams } from "@/lib/link-params";
import { useNow } from "@/lib/use-now";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

const LIST_LIMIT = 8;

/**
 * "Today's tasks", the first thing an agent sees: what's overdue (red), what's
 * still due today, what's done, today's calls, then the follow-ups themselves.
 */
export function TodayTasksCard() {
  const { colors } = useTheme();
  const now = useNow();
  const bounds = useMemo(() => localDayBounds(now), [now]);
  const summary = useFollowUpSummary(bounds);
  const calls = useCallSummary(useMemo(() => ({ from: bounds.dayStart, to: bounds.dayEnd }), [bounds]));
  const followUps = useFollowUps(
    useMemo(() => ({ status: "pending" as const, until: bounds.dayEnd, limit: LIST_LIMIT, scope: "mine" as const }), [bounds]),
  );
  const actions = useFollowUpActions();

  const s = summary.data;
  const c = calls.data;
  const items = flattenPages(followUps.data).slice(0, LIST_LIMIT);
  const total = followUps.data?.pages[0]?.meta.total ?? 0;
  const overdue = (s?.overdue ?? 0) > 0;

  return (
    <Card style={overdue && { borderColor: colors.danger }}>
      <CardHeader
        title="Today's tasks"
        description={`${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · overdue first`}
        action={{ label: "All", onPress: () => router.navigate("/follow-ups") }}
      />
      <View style={styles.tiles}>
        <Tile label="Overdue" value={s?.overdue} icon="alarm-outline" tone={overdue ? "danger" : undefined} view="overdue" />
        <Tile label="Still due today" value={s?.dueToday} icon="calendar-outline" tone="warning" view="today" />
        <Tile label="Done today" value={s?.doneToday} icon="checkmark-circle-outline" tone="success" view="done" />
        <Tile
          label={c && c.durationSeconds > 0 ? `Calls · ${formatDuration(c.durationSeconds)} talk` : "Calls reached / made"}
          value={c ? `${c.reached}/${c.total}` : undefined}
          icon="call-outline"
        />
      </View>

      {followUps.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : items.length === 0 ? (
        <AppText muted>Nothing left for today. Plan your next calls from a lead's screen.</AppText>
      ) : (
        <View style={styles.list}>
          {items.map((followUp) => (
            <FollowUpRow
              key={followUp.id}
              followUp={followUp}
              now={now}
              onComplete={actions.onComplete}
              onMore={actions.onMore}
            />
          ))}
          {total > items.length && (
            <AppText variant="small" muted style={styles.more} onPress={() => router.navigate("/follow-ups")}>
              +{total - items.length} more in Follow-ups
            </AppText>
          )}
        </View>
      )}
      {actions.sheets}
    </Card>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
  view,
}: {
  label: string;
  value: number | string | undefined;
  icon: ComponentProps<typeof Ionicons>["name"];
  tone?: "danger" | "warning" | "success";
  view?: FollowUpView;
}) {
  const { colors } = useTheme();
  const toneColor = tone ? { danger: colors.danger, warning: colors.warning, success: colors.success }[tone] : colors.mutedText;
  const danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole={view ? "button" : undefined}
      accessibilityLabel={`${label}: ${value ?? "loading"}`}
      disabled={!view}
      onPress={() => view && router.navigate({ pathname: "/follow-ups", params: linkParams({ view }) })}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: danger ? colors.danger : colors.border,
          backgroundColor: danger ? colors.dangerSoft : colors.background,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name={icon} size={18} color={toneColor} />
      <View style={styles.flex}>
        <AppText variant="heading" color={danger ? colors.danger : undefined}>
          {value ?? "–"}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: { gap: spacing.sm },
  more: { textAlign: "center", paddingVertical: spacing.xs },
});
