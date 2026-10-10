import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { usePlanSummary } from "@/features/plans/hooks";
import { formatBytes, PLAN_FEATURES, planFeatureLabels, planLabels, type PlanLimit, type PlanSummary } from "@/features/plans/types";
import { daysUntil, formatDate } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const LIMIT_ROWS: { limit: PlanLimit; label: string; format: (n: number) => string }[] = [
  { limit: "users", label: "Users", format: (n) => n.toLocaleString() },
  { limit: "leads", label: "Leads", format: (n) => n.toLocaleString() },
  { limit: "storageBytes", label: "File storage", format: formatBytes },
];

function billingLine(summary: PlanSummary) {
  if (summary.billingStatus === "trial" && summary.trialEndsAt) {
    if (summary.readOnly) return `Free trial ended ${formatDate(summary.trialEndsAt)}`;
    const days = Math.max(0, daysUntil(summary.trialEndsAt));
    return `Free trial · ${days === 0 ? "ends today" : `${days} ${days === 1 ? "day" : "days"} left`} (${formatDate(summary.trialEndsAt)})`;
  }
  if (summary.billingStatus === "paid" && summary.paidUntil) {
    return summary.readOnly ? `Payment was due ${formatDate(summary.paidUntil)}` : `Paid until ${formatDate(summary.paidUntil)}`;
  }
  return summary.billingStatus === "trial" ? "Free trial" : "Paid";
}

/** Owners and admins: the current plan, what it uses, and every plan to compare. */
export default function PlanScreen() {
  const { colors } = useTheme();
  const plan = usePlanSummary();
  if (plan.isPending) return <LoadingView />;
  if (!plan.data) return <ErrorView error={plan.error} onRetry={() => void plan.refetch()} />;
  const data = plan.data;
  const used: Record<PlanLimit, number> = { users: data.usage.users, leads: data.usage.leads, storageBytes: data.usage.storageBytes };

  return (
    <Screen onRefresh={() => plan.refetch()}>
      <Card>
        <View style={styles.titleRow}>
          <AppText variant="heading">{planLabels[data.plan]} plan</AppText>
          <Badge
            label={data.readOnly ? "Read-only" : data.billingStatus === "trial" ? "Free trial" : "Paid"}
            color={data.readOnly ? "rose" : "indigo"}
          />
        </View>
        <AppText muted>{billingLine(data)}</AppText>
        {data.readOnly && data.readOnlyReason && <Banner tone="danger" message={data.readOnlyReason} />}
        {LIMIT_ROWS.map(({ limit, label, format }) => {
          const max = data.limits[limit];
          const percent = max > 0 ? Math.min(100, (used[limit] / max) * 100) : 100;
          const full = used[limit] >= max;
          return (
            <View key={limit} style={styles.usage}>
              <View style={styles.usageRow}>
                <AppText weight="600" style={styles.flex}>
                  {label}
                </AppText>
                <AppText variant="small" weight={full ? "700" : undefined} color={full ? colors.danger : colors.mutedText}>
                  {format(used[limit])} of {format(max)}
                </AppText>
              </View>
              <ProgressBar
                percent={percent}
                label={label}
                color={full ? colors.danger : percent >= 80 ? colors.warning : undefined}
                height={8}
              />
              {limit === "users" && data.usage.pendingInvitations > 0 && (
                <AppText variant="small" muted>
                  {data.usage.activeUsers} active and {data.usage.pendingInvitations} open{" "}
                  {data.usage.pendingInvitations === 1 ? "invitation" : "invitations"}
                </AppText>
              )}
              {limit === "leads" && (
                <AppText variant="small" muted>
                  Leads in the recycle bin don&apos;t count.
                </AppText>
              )}
            </View>
          );
        })}
      </Card>

      <AppText variant="heading">Compare plans</AppText>
      <AppText variant="small" muted>
        Changing plans keeps all your data.
      </AppText>
      {data.plans.map((p) => {
        const current = p.key === data.plan;
        return (
          <Card key={p.key} style={current && { borderColor: colors.primary }}>
            <View style={styles.titleRow}>
              <AppText variant="heading">{p.name}</AppText>
              {current && <Badge label="Current" color="indigo" />}
            </View>
            <AppText variant="small" muted>
              {p.description}
            </AppText>
            {LIMIT_ROWS.map(({ limit, label, format }) => (
              <AppText key={limit} variant="small">
                {label}: <AppText variant="small" weight="600">{limit === "users" ? `up to ${format(p.limits[limit])}` : format(p.limits[limit])}</AppText>
              </AppText>
            ))}
            {PLAN_FEATURES.map((feature) => {
              const included = p.features.includes(feature);
              return (
                <View key={feature} style={styles.feature}>
                  <Ionicons
                    name={included ? "checkmark-circle" : "remove-circle-outline"}
                    size={16}
                    color={included ? colors.success : colors.mutedText}
                    accessibilityLabel={included ? "Included" : "Not included"}
                  />
                  <AppText variant="small" muted={!included}>
                    {planFeatureLabels[feature]}
                  </AppText>
                </View>
              );
            })}
          </Card>
        );
      })}
      <Button title="Billing and invoices" variant="secondary" icon="receipt-outline" onPress={() => router.push("/settings/billing")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  usage: { gap: spacing.xs, marginTop: spacing.xs },
  usageRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
});
