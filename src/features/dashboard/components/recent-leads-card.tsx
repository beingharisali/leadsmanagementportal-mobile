import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { RatingBadge, StageBadge } from "@/features/leads/components/lead-badges";
import { useLeads } from "@/features/leads/hooks";
import { flattenPages } from "@/lib/infinite";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { CardHeader } from "./card-header";

const PARAMS = { limit: 6, sort: "-updatedAt" as const };

/** The latest movement on the leads this person can see. */
export function RecentLeadsCard({ manager }: { manager: boolean }) {
  const { colors } = useTheme();
  const leads = useLeads(PARAMS);
  const items = flattenPages(leads.data).slice(0, PARAMS.limit);

  return (
    <Card>
      <CardHeader
        title="Recently updated"
        description={`Latest movement on ${manager ? "all" : "your"} leads`}
        action={{ label: "View all", onPress: () => router.navigate("/leads") }}
      />
      {leads.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : items.length === 0 ? (
        <AppText muted>{manager ? "No leads yet. Add your first lead to get started." : "Leads assigned to you will appear here."}</AppText>
      ) : (
        items.map((lead, index) => (
          <Pressable
            key={lead.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/leads/[id]", params: { id: lead.id } })}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            <AppText weight="500" numberOfLines={1}>
              {lead.businessName}
            </AppText>
            <AppText variant="small" muted numberOfLines={1}>
              {lead.name} · updated {formatDate(lead.updatedAt)}
              {manager ? ` · ${lead.assignedTo?.name ?? "Unassigned"}` : ""}
            </AppText>
            <View style={styles.badges}>
              <StageBadge status={lead.status} />
              <RatingBadge rating={lead.rating} />
            </View>
          </Pressable>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm },
  badges: { flexDirection: "row", gap: spacing.xs + 2 },
});
