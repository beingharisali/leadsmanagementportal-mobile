import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { formatMoney } from "@/features/billing/hooks";
import { CompanyRow, OrganizationStatusBadge } from "@/features/platform/components/company-row";
import { trialDaysLeft, useBillingStats, usePlatformOverview } from "@/features/platform/hooks";
import { planLabels } from "@/features/plans/types";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Heapware staff: the whole SaaS at a glance, and who needs a follow-up. */
export default function ConsoleOverviewScreen() {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const overview = usePlatformOverview();
  const billing = useBillingStats();
  const data = overview.data;
  const stats = data?.companies;
  const money = billing.data;

  const tiles: { title: string; value: string | number | undefined; hint?: string; href?: "/console/payments" | "/console/invoices" | "/console/companies" }[] = [
    { title: "Companies", value: stats?.total, hint: stats && `${stats.active} active · ${stats.suspended} suspended`, href: "/console/companies" },
    { title: "New this month", value: data?.newThisMonth, hint: data && `${data.signupsThisMonth} signed up themselves` },
    { title: "On free trial", value: stats?.trialing, hint: stats && `${stats.trialExpired} trials have ended` },
    {
      title: "Paying",
      value: stats?.paid,
      hint: stats && `${stats.overdue} overdue · ${stats.byPlan.starter} Starter · ${stats.byPlan.growth} Growth · ${stats.byPlan.business} Business`,
    },
    { title: "Monthly recurring", value: money && formatMoney(money.monthlyRecurring, money.currency), hint: "Paying companies × monthly price" },
    { title: "Collected this month", value: money && formatMoney(money.revenueThisMonth, money.currency), hint: "Invoices paid since the 1st" },
    { title: "Payments to review", value: money?.pendingPayments, hint: "Approve or reject receipts", href: "/console/payments" },
    {
      title: "Overdue invoices",
      value: money?.overdueInvoices,
      hint: money && `${formatMoney(money.overdueAmount, money.currency)} unpaid past the due date`,
      href: "/console/invoices",
    },
    { title: "Active users", value: data?.activeUsers, hint: "Across every company" },
    { title: "Leads managed", value: data?.leads.toLocaleString(), hint: "Across every company" },
  ];

  return (
    <Screen onRefresh={() => Promise.all([overview.refetch(), billing.refetch()])}>
      <AppText variant="title">Hello, {user.name.split(" ")[0]}</AppText>
      <AppText muted>Every company using GetCloseWise, and who needs a follow-up.</AppText>

      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.title}
            accessibilityRole={tile.href ? "button" : undefined}
            disabled={!tile.href}
            onPress={() => tile.href && router.push(tile.href)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            <AppText variant="small" muted numberOfLines={1}>
              {tile.title}
            </AppText>
            <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
              {tile.value ?? "–"}
            </AppText>
            {tile.hint ? (
              <AppText variant="small" muted numberOfLines={2}>
                {tile.hint}
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </View>

      <Card>
        <AppText variant="heading">Trials ending this week</AppText>
        <AppText variant="small" muted>
          Reach out before they lose access.
        </AppText>
        {overview.isPending ? (
          <AppText muted>Loading…</AppText>
        ) : data?.trialsEndingSoon.length === 0 ? (
          <AppText muted>No trials end in the next 7 days.</AppText>
        ) : (
          data?.trialsEndingSoon.map((organization) => {
            const days = trialDaysLeft(organization) ?? 0;
            return (
              <CompanyRow
                key={organization.id}
                organization={organization}
                detail={
                  <AppText variant="small" weight={days <= 2 ? "700" : undefined} color={days <= 2 ? colors.danger : colors.mutedText}>
                    {days === 0 ? "Ends today" : `${days} ${days === 1 ? "day" : "days"} left`}
                  </AppText>
                }
              />
            );
          })
        )}
      </Card>

      <Card>
        <AppText variant="heading">Newest companies</AppText>
        <AppText variant="small" muted>
          Recent sign-ups and companies you added.
        </AppText>
        {data?.recentCompanies.map((organization) => (
          <CompanyRow
            key={organization.id}
            organization={organization}
            detail={
              <View style={styles.detail}>
                <OrganizationStatusBadge organization={organization} />
                <AppText variant="small" muted>
                  {planLabels[organization.plan] ?? organization.plan} · {formatDate(organization.createdAt)}
                </AppText>
              </View>
            }
          />
        ))}
        <Button title="All companies" variant="secondary" onPress={() => router.push("/console/companies")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  detail: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
});
