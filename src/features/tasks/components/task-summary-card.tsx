import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useTaskAccess, useTaskSummary } from "../hooks";
import type { TaskCounts } from "../types";

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/tasks")}
      style={({ pressed }) => [styles.tile, { borderColor: colors.border }, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <AppText variant="small" muted>
        {label}
      </AppText>
      <AppText variant="heading" color={value > 0 ? tone : undefined}>
        {value}
      </AppText>
    </Pressable>
  );
}

function Counts({ counts }: { counts: TaskCounts }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      <Tile label="Due today" value={counts.dueToday} tone={colors.primary} />
      <Tile label="Overdue" value={counts.overdue} tone={colors.danger} />
      <Tile label="Open" value={counts.open} />
      <Tile label="Done this week" value={counts.doneThisWeek} tone={colors.success} />
    </View>
  );
}

/**
 * Task numbers for Home (same as the website): yours, what waits for your
 * approval, and the team's for the owner and department heads. Nothing for
 * people who don't use tasks.
 */
export function TaskSummaryCard() {
  const { colors } = useTheme();
  const access = useTaskAccess();
  const summary = useTaskSummary(Boolean(access.data?.usesTasks));
  if (!access.data?.usesTasks || !summary.data) return null;
  const data = summary.data;

  return (
    <>
      {access.data.canReceive && (
        <Card>
          <AppText variant="heading">My tasks</AppText>
          <Counts counts={data.mine} />
        </Card>
      )}
      {(access.data.canAssign || data.waitingForMyApproval > 0) && (
        <Card>
          <AppText variant="heading">Tasks I gave</AppText>
          <View style={styles.grid}>
            <Tile label="To approve" value={data.waitingForMyApproval} tone={colors.warning} />
            <Tile label="Open" value={data.given.open} />
            <Tile label="Overdue" value={data.given.overdue} tone={colors.danger} />
            <Tile label="Done this week" value={data.given.doneThisWeek} tone={colors.success} />
          </View>
        </Card>
      )}
      {data.team && (
        <Card>
          <AppText variant="heading">{access.data.isOwner ? "Whole team" : "My departments"}</AppText>
          <Counts counts={data.team} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
});
