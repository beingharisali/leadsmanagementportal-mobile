import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatFollowUpRelative, localDayBounds } from "@/features/follow-ups/format";
import { useFollowUpSummary } from "@/features/follow-ups/hooks";
import { linkParams } from "@/lib/link-params";
import { useNow } from "@/lib/use-now";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

/** Managers: who on the team has overdue follow-ups (red) and how much is due today. */
export function TeamFollowUpsCard() {
  const { colors } = useTheme();
  const now = useNow();
  const bounds = useMemo(() => localDayBounds(now), [now]);
  const summary = useFollowUpSummary({ ...bounds, team: true });
  const data = summary.data;
  const rows = data?.team ?? [];

  const openTeam = (view: "overdue" | "today") =>
    router.navigate({ pathname: "/follow-ups", params: linkParams({ view, scope: "team" }) });

  return (
    <Card style={data?.teamOverdue ? { borderColor: colors.danger } : undefined}>
      <CardHeader
        title="Team follow-ups"
        description={
          data ? `${data.teamOverdue ?? 0} overdue · ${data.teamDueToday ?? 0} still due today` : "Overdue and due today, per agent"
        }
        action={{ label: "All", onPress: () => openTeam("overdue") }}
      />
      {summary.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : rows.length === 0 ? (
        <AppText muted>Nobody has anything overdue or due today.</AppText>
      ) : (
        <View>
          {rows.map((row) => (
            <Pressable
              key={row.user?.id ?? "unassigned"}
              accessibilityRole="button"
              onPress={() => openTeam(row.overdue > 0 ? "overdue" : "today")}
              style={({ pressed }) => [
                styles.row,
                row.overdue > 0 && { backgroundColor: colors.dangerSoft },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.flex}>
                <AppText
                  weight="500"
                  numberOfLines={1}
                  muted={row.user?.isActive === false}
                  style={row.user?.isActive === false && styles.strike}
                >
                  {row.user?.name ?? "Unassigned leads"}
                </AppText>
                {row.overdue > 0 && (
                  <AppText variant="small" color={colors.danger}>
                    Oldest: {formatFollowUpRelative(row.oldestDueAt, now).toLowerCase()}
                  </AppText>
                )}
              </View>
              <View style={styles.badges}>
                {row.overdue > 0 && <Badge label={`${row.overdue} overdue`} color="rose" />}
                {row.dueToday > 0 && <Badge label={`${row.dueToday} today`} color="slate" />}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  badges: { alignItems: "flex-end", gap: spacing.xs },
  strike: { textDecorationLine: "line-through" },
});
