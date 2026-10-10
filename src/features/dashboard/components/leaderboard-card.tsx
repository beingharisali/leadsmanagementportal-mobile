import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCurrentUser } from "@/features/auth/auth-provider";
import {
  LEADERBOARD_PERIODS,
  leaderboardPeriodLabels,
  useLeaderboard,
  type LeaderboardPeriod,
} from "@/features/performance/hooks";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

/** Gold, silver, bronze for the top three. */
const MEDALS = ["#F59E0B", "#9CA3AF", "#C2410C"];
const SHOWN = 8;

/** Same bands as the website's score badge (client/features/performance/components/score-badge.tsx). */
function scoreColor(score: number) {
  if (score >= 75) return "emerald" as const;
  if (score >= 50) return "amber" as const;
  return "rose" as const;
}

/** The team ranked by productivity score; on plans with team monitoring. */
export function LeaderboardCard() {
  const user = useCurrentUser();
  const { colors } = useTheme();
  const hasMonitoring = user.organization?.features.includes("monitoring") ?? false;
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const leaderboard = useLeaderboard(period, hasMonitoring);
  if (!hasMonitoring) return null;

  const rows = leaderboard.data?.rows ?? [];
  const me = rows.find((r) => r.isMe);
  // Someone outside the top rows still sees where they stand.
  const shown = [...rows.slice(0, SHOWN), ...(me && me.rank > SHOWN ? [me] : [])];

  return (
    <Card>
      <CardHeader title="Leaderboard" description="Ranked by productivity score" />
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        segments={LEADERBOARD_PERIODS.map((p) => ({ value: p, label: leaderboardPeriodLabels[p] }))}
      />
      {leaderboard.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : rows.length === 0 ? (
        <AppText muted>No agents yet.</AppText>
      ) : (
        <View>
          {shown.map((row) => (
            <View key={row.user.id} style={[styles.row, row.isMe && { backgroundColor: colors.primarySoft }]}>
              <View style={styles.rank}>
                {row.rank <= 3 ? (
                  <Ionicons name="medal" size={18} color={MEDALS[row.rank - 1]} accessibilityLabel={`Rank ${row.rank}`} />
                ) : (
                  <AppText muted weight="600">
                    {row.rank}
                  </AppText>
                )}
              </View>
              <View style={styles.flex}>
                <AppText weight="500" numberOfLines={1}>
                  {row.user.name}
                  {row.isMe && (
                    <AppText variant="small" muted>
                      {" "}
                      (you)
                    </AppText>
                  )}
                </AppText>
                <AppText variant="small" muted>
                  {row.won} won · {row.calls} calls · {row.followUpsDone} follow-ups
                </AppText>
              </View>
              <Badge label={String(row.score)} color={scoreColor(row.score)} />
            </View>
          ))}
        </View>
      )}
      {rows.length > 0 && rows.every((r) => r.score === 0) && (
        <AppText variant="small" muted>
          Scores fill in as the team calls, messages and follows up.
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rank: { width: 24, alignItems: "center" },
});
