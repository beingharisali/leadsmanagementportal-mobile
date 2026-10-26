import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { Sheet } from "@/components/ui/sheet";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useLeadOptions } from "@/features/customization/hooks";
import {
  AssignedDateSection,
  NO_ASSIGNED,
  assignedLabels,
  assignedRangeFor,
  useCompanyToday,
  type AssignedFilter,
} from "@/features/leads/components/assigned-date-filter";
import { LeadRow } from "@/features/leads/components/lead-row";
import { useDeleteLeadsByStatus, useLeads, useLeadStats } from "@/features/leads/hooks";
import type { Lead } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { UNASSIGNED, UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { isManagerRole } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
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
  const manager = isManagerRole(user.role);
  const { colors, scheme } = useTheme();
  const { stages } = useLeadOptions();
  const stats = useLeadStats();
  const [selected, setSelected] = useState<string | null>(null);
  const stage = selected ?? stages[0]?.key ?? "new";
  // Managers: "all", "unassigned" or a user id
  const [agentScope, setAgentScope] = useState("all");
  const [assigned, setAssigned] = useState<AssignedFilter>(NO_ASSIGNED);
  const [pickingAgent, setPickingAgent] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const users = useAssignableUsers(manager);
  const today = useCompanyToday();
  const agent = users.data?.find((u) => u.id === agentScope);
  const filtered = agentScope !== "all" || assigned.assigned !== "";

  const params = useMemo(
    () => ({
      status: [stage],
      sort: "-updatedAt" as const,
      assignedTo: manager && agentScope !== "all" ? agentScope : undefined,
      ...assignedRangeFor(assigned, today),
    }),
    [stage, manager, agentScope, assigned, today],
  );
  const leads = useLeads(params);
  const statFor = (key: string) => stats.data?.byStatus.find((s) => s.status === key);
  const current = statFor(stage);
  const filteredTotal = leads.data?.pages[0]?.meta.total;
  const canEdit = useCanEdit();
  const deleteByStatus = useDeleteLeadsByStatus();
  const stageLabel = stages.find((s) => s.key === stage)?.label ?? stage;

  function deleteStage() {
    const count = filteredTotal ?? 0;
    if (count === 0) return;
    Alert.alert(
      `Delete all ${count} lead${count === 1 ? "" : "s"} in ${stageLabel}?`,
      `${filtered ? "Only the leads matching your filters (agent and assigned date) are deleted. " : ""}They will be moved to the recycle bin, where you can restore them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to bin",
          style: "destructive",
          onPress: () =>
            deleteByStatus.mutate(
              {
                status: stage,
                assignedTo: params.assignedTo,
                assignedFrom: params.assignedFrom,
                assignedUntil: params.assignedUntil,
              },
              {
                onSuccess: (result) =>
                  Alert.alert(
                    "Leads deleted",
                    `${result.deleted} lead${result.deleted === 1 ? "" : "s"} moved to the recycle bin.`,
                  ),
                onError: (error) => Alert.alert("Couldn't delete the leads", getErrorMessage(error)),
              },
            ),
        },
      ],
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => <LeadRow lead={item} showAssignee={manager} showAssignedAt />,
    [manager],
  );

  return (
    <>
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
            <View style={styles.filters}>
              {manager && (
                <>
                  <Chip label="Everyone" selected={agentScope === "all"} onPress={() => setAgentScope("all")} />
                  <Chip
                    label={agent ? agent.name : agentScope === "unassigned" ? "Unassigned" : "Agent…"}
                    icon="person-outline"
                    selected={agentScope !== "all"}
                    onPress={() => setPickingAgent(true)}
                  />
                </>
              )}
              <Chip
                label={assigned.assigned ? `Assigned: ${assignedLabels[assigned.assigned].toLowerCase()}` : "Assigned date"}
                icon="calendar-outline"
                selected={assigned.assigned !== ""}
                onPress={() => setPickingDate(true)}
              />
            </View>
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
                    {!filtered && (
                      <AppText variant="small" muted>
                        {statFor(s.key)?.count ?? 0}
                      </AppText>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            {filtered && filteredTotal !== undefined && (
              <AppText variant="small" muted>
                {filteredTotal} lead{filteredTotal === 1 ? "" : "s"} in this stage match the filters
              </AppText>
            )}
            {!filtered && current && current.budget > 0 && (
              <AppText variant="small" muted>
                {current.count} lead{current.count === 1 ? "" : "s"} · {formatCurrency(current.budget)} total budget
              </AppText>
            )}
            {manager && canEdit && (filteredTotal ?? 0) > 0 && (
              <Button
                title={`Delete all in ${stageLabel}`}
                icon="trash-outline"
                variant="secondary"
                loading={deleteByStatus.isPending}
                onPress={deleteStage}
              />
            )}
          </>
        }
        empty={
          filtered ? (
            <EmptyView icon="search-outline" title="No leads match" message="Try another agent or date, or clear the filters." />
          ) : (
            <EmptyView icon="git-branch-outline" title="No leads in this stage" />
          )
        }
      />
      {manager && (
        <UserPickerSheet
          open={pickingAgent}
          onClose={() => setPickingAgent(false)}
          title="Show leads of"
          value={agent?.id ?? (agentScope === "unassigned" ? UNASSIGNED : null)}
          onSelect={(id) => {
            setAgentScope(id ?? "unassigned");
            setPickingAgent(false);
          }}
        />
      )}
      <Sheet
        open={pickingDate}
        onClose={() => setPickingDate(false)}
        title="When was the lead assigned?"
        footer={
          <>
            <Button title="Done" onPress={() => setPickingDate(false)} />
            {assigned.assigned !== "" && (
              <Button title="Any date" variant="ghost" onPress={() => setAssigned(NO_ASSIGNED)} />
            )}
          </>
        }
      >
        <AssignedDateSection value={assigned} onChange={setAssigned} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
