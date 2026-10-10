import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useLeadOptions } from "@/features/customization/hooks";
import { leadRatingColors, leadRatingLabels } from "@/features/leads/config";
import type { LeadStats } from "@/features/leads/hooks";
import { LEAD_RATINGS } from "@/features/leads/types";
import { linkParams } from "@/lib/link-params";
import { accentColor } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

const compact = new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 });

/** "Rs 4.5M" */
function compactCurrency(value: number) {
  return `Rs ${compact.format(value)}`;
}

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The four headline numbers: leads, unassigned / open, open pipeline value, win rate. */
export function StatTiles({ stats, manager }: { stats: LeadStats; manager: boolean }) {
  const { stageLabel } = useLeadOptions();
  return (
    <View style={styles.tiles}>
      <StatTile
        title={manager ? "Total leads" : "My leads"}
        value={String(stats.total)}
        hint={`${stats.createdThisMonth} added this month`}
        icon="people-outline"
        href="/leads"
      />
      {manager ? (
        <StatTile
          title="Unassigned"
          value={String(stats.unassigned)}
          hint="Waiting for an agent"
          icon="person-add-outline"
          href={{ pathname: "/leads", params: linkParams({ assignedTo: "unassigned" }) }}
        />
      ) : (
        <StatTile
          title="Open leads"
          value={String(stats.openCount)}
          hint={`Not yet ${stageLabel("won").toLowerCase()} or ${stageLabel("lost").toLowerCase()}`}
          icon="file-tray-outline"
        />
      )}
      <StatTile
        title="Open pipeline"
        value={compactCurrency(stats.openBudget)}
        hint={`Budget across ${stats.openCount} open leads`}
        icon="wallet-outline"
        href="/pipeline"
      />
      <StatTile
        title="Win rate"
        value={`${stats.winRate}%`}
        hint={`${stats.wonCount} won · ${compactCurrency(stats.wonBudget)}`}
        icon={stats.winRate >= 50 ? "trending-up" : "flag-outline"}
      />
    </View>
  );
}

function StatTile({
  title,
  value,
  hint,
  icon,
  href,
}: {
  title: string;
  value: string;
  hint: string;
  icon: IconName;
  href?: Href;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={href ? "button" : undefined}
      accessibilityLabel={`${title}: ${value}. ${hint}`}
      disabled={!href}
      onPress={() => href && router.navigate(href)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={styles.tileHeader}>
        <AppText variant="small" muted style={styles.flex} numberOfLines={1}>
          {title}
        </AppText>
        <Ionicons name={icon} size={16} color={colors.mutedText} />
      </View>
      <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="small" muted numberOfLines={2}>
        {hint}
      </AppText>
    </Pressable>
  );
}

/** Leads and budget in each stage, as bars. */
export function PipelineByStageCard({ stats }: { stats: LeadStats }) {
  const { scheme } = useTheme();
  const { stageLabel, stageColor } = useLeadOptions();
  const max = Math.max(...stats.byStatus.map((s) => s.count), 1);
  return (
    <Card>
      <CardHeader
        title="Pipeline by stage"
        description="Leads and budget in each stage"
        action={{ label: "Open", onPress: () => router.push("/pipeline") }}
      />
      {stats.byStatus.map(({ status, count, budget }) => (
        <View key={status} style={styles.barRow}>
          <View style={styles.barLabel}>
            <AppText variant="small" numberOfLines={1} style={styles.flex}>
              {stageLabel(status)}
            </AppText>
            <AppText variant="small" muted>
              {count} · {compactCurrency(budget)}
            </AppText>
          </View>
          <ProgressBar percent={(count / max) * 100} color={accentColor(stageColor(status), scheme)} label={stageLabel(status)} />
        </View>
      ))}
    </Card>
  );
}

/** Where leads come from, as a share of all leads. */
export function LeadSourcesCard({ stats }: { stats: LeadStats }) {
  const { sourceLabel } = useLeadOptions();
  return (
    <Card>
      <CardHeader title="Lead sources" description="Where leads come from" />
      {stats.bySource.length === 0 ? (
        <AppText muted>No leads yet.</AppText>
      ) : (
        stats.bySource.map(({ source, count }) => {
          const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
          return (
            <View key={source} style={styles.barRow}>
              <View style={styles.barLabel}>
                <AppText variant="small" style={styles.flex}>
                  {sourceLabel(source)}
                </AppText>
                <AppText variant="small" muted>
                  {count} · {pct}%
                </AppText>
              </View>
              <ProgressBar percent={pct} label={sourceLabel(source)} />
            </View>
          );
        })
      )}
    </Card>
  );
}

/** Open leads by rating, best first: where to spend today's calls. */
export function LeadTemperatureCard({ stats }: { stats: LeadStats }) {
  const { scheme, colors } = useTheme();
  const total = LEAD_RATINGS.reduce((sum, r) => sum + (stats.byRating?.[r] ?? 0), 0);
  return (
    <Card>
      <CardHeader
        title="Lead temperature"
        description="Open leads by score: hot, warm and cold"
        action={{ label: "Hot leads", onPress: () => router.navigate({ pathname: "/leads", params: linkParams({ rating: "hot" }) }) }}
      />
      {total === 0 ? (
        <AppText muted>No open leads yet.</AppText>
      ) : (
        LEAD_RATINGS.map((rating) => {
          const count = stats.byRating?.[rating] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <Pressable
              key={rating}
              accessibilityRole="button"
              onPress={() => router.navigate({ pathname: "/leads", params: linkParams({ rating }) })}
              style={({ pressed }) => [styles.barRow, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <View style={styles.barLabel}>
                <AppText variant="small" style={styles.flex}>
                  {leadRatingLabels[rating]}
                </AppText>
                <AppText variant="small" muted>
                  {count} · {pct}%
                </AppText>
              </View>
              <ProgressBar
                percent={pct}
                color={accentColor(leadRatingColors[rating], scheme)}
                label={leadRatingLabels[rating]}
              />
            </Pressable>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  tileHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  barRow: { gap: spacing.xs, borderRadius: radius.sm },
  barLabel: { flexDirection: "row", gap: spacing.sm },
});
