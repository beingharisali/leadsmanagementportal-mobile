import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TARGET_METRICS, targetMetricLabels, type TargetMetric } from "@/features/customization/types";
import { useTargets, type TargetProgress } from "@/features/performance/hooks";
import { formatCurrency } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

function format(metric: TargetMetric, value: number) {
  return metric === "wonValue" ? formatCurrency(value) : String(value);
}

/** Metrics with a target set (0 = none). */
function withTarget(progress: TargetProgress) {
  return TARGET_METRICS.filter((metric) => progress[metric].target > 0);
}

/** "October 2026" from "2026-10". */
function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Agents: progress towards today's and this month's targets. Hidden when none are set. */
export function MyTargetsCard() {
  const targets = useTargets();
  const mine = targets.data?.rows[0];
  if (!targets.data || !mine?.hasTargets) return null;
  const daily = withTarget(mine.daily);
  const monthly = withTarget(mine.monthly);
  if (daily.length === 0 && monthly.length === 0) return null;

  return (
    <Card>
      <CardHeader title="My targets" description="Updated through the day" />
      {daily.length > 0 && <Period title="Today" progress={mine.daily} metrics={daily} />}
      {monthly.length > 0 && <Period title={monthName(targets.data.month)} progress={mine.monthly} metrics={monthly} />}
    </Card>
  );
}

function Period({ title, progress, metrics }: { title: string; progress: TargetProgress; metrics: TargetMetric[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.period}>
      <AppText variant="small" muted weight="600" style={styles.caps}>
        {title.toUpperCase()}
      </AppText>
      {metrics.map((metric) => {
        const { actual, target } = progress[metric];
        const done = actual >= target;
        return (
          <View key={metric} style={styles.metric}>
            <View style={styles.metricRow}>
              <AppText variant="small">{targetMetricLabels[metric]}</AppText>
              <AppText variant="small" muted>
                <AppText variant="small" weight="600" color={done ? colors.success : undefined}>
                  {format(metric, actual)}
                </AppText>{" "}
                / {format(metric, target)}
              </AppText>
            </View>
            <ProgressBar
              percent={target > 0 ? (actual / target) * 100 : 0}
              color={done ? colors.success : undefined}
              label={targetMetricLabels[metric]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  period: { gap: spacing.sm, marginTop: spacing.xs },
  caps: { letterSpacing: 0.5 },
  metric: { gap: spacing.xs },
  metricRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
