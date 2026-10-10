import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useLeadOptions } from "@/features/customization/hooks";
import { LeadRow } from "@/features/leads/components/lead-row";
import { useLeads, useLeadStats } from "@/features/leads/hooks";
import type { Lead } from "@/features/leads/types";
import { isManagerRole } from "@/features/users/types";
import { flattenPages } from "@/lib/infinite";
import { formatCurrency } from "@/lib/format";
import { accentColor, withAlpha } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/**
 * The pipeline on a phone: one stage at a time instead of the website's
 * board. Swipe through the stages at the top; change a lead's stage on its screen.
 */
export default function PipelineScreen() {
  const user = useCurrentUser();
  const { colors, scheme } = useTheme();
  const { stages } = useLeadOptions();
  const stats = useLeadStats();
  const [selected, setSelected] = useState<string | null>(null);
  const stage = selected ?? stages[0]?.key ?? "new";

  const params = useMemo(() => ({ status: [stage], sort: "-updatedAt" as const }), [stage]);
  const leads = useLeads(params);
  const statFor = (key: string) => stats.data?.byStatus.find((s) => s.status === key);
  const current = statFor(stage);

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => <LeadRow lead={item} showAssignee={isManagerRole(user.role)} />,
    [user.role],
  );

  return (
    <InfiniteList
      items={flattenPages(leads.data)}
      renderItem={renderItem}
      keyExtractor={(lead) => lead.id}
      isPending={leads.isPending}
      error={leads.error}
      onRetry={() => void leads.refetch()}
      onRefresh={() => Promise.all([leads.refetch(), stats.refetch()])}
      hasNextPage={leads.hasNextPage}
      isFetchingNextPage={leads.isFetchingNextPage}
      fetchNextPage={() => void leads.fetchNextPage()}
      header={
        <>
          {stats.data && (
            <AppText variant="small" muted>
              {stats.data.openCount} open · {formatCurrency(stats.data.openBudget)} in play · {stats.data.winRate}% win rate
            </AppText>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stages}>
            {stages.map((s) => {
              const active = s.key === stage;
              const color = accentColor(s.color, scheme);
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(s.key)}
                  style={[
                    styles.stage,
                    {
                      borderColor: active ? color : colors.border,
                      backgroundColor: active ? withAlpha(color, 0.14) : colors.card,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <AppText variant="small" weight={active ? "700" : "500"} color={active ? color : undefined}>
                    {s.label}
                  </AppText>
                  <AppText variant="small" muted>
                    {statFor(s.key)?.count ?? 0}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          {current && current.budget > 0 && (
            <AppText variant="small" muted>
              {current.count} lead{current.count === 1 ? "" : "s"} · {formatCurrency(current.budget)} total budget
            </AppText>
          )}
        </>
      }
      empty={<EmptyView icon="git-branch-outline" title="No leads in this stage" />}
    />
  );
}

const styles = StyleSheet.create({
  stages: { gap: spacing.sm, paddingVertical: 2 },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
