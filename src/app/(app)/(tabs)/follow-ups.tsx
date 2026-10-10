import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { FollowUpRow } from "@/features/follow-ups/components/follow-up-row";
import { useFollowUpActions } from "@/features/follow-ups/components/use-follow-up-actions";
import { followUpTypeIcons, followUpTypeLabels, localDayBounds } from "@/features/follow-ups/format";
import { useFollowUps, useFollowUpSummary } from "@/features/follow-ups/hooks";
import {
  FOLLOW_UP_TYPES,
  FOLLOW_UP_VIEWS,
  type FollowUp,
  type FollowUpListParams,
  type FollowUpType,
  type FollowUpView,
} from "@/features/follow-ups/types";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { isManagerRole } from "@/features/users/types";
import { flattenPages } from "@/lib/infinite";
import { useNow } from "@/lib/use-now";
import { spacing } from "@/theme/colors";

const EMPTY: Record<FollowUpView, { title: string; message: string }> = {
  overdue: { title: "Nothing overdue", message: "Every follow-up is on time. Nice work." },
  today: { title: "Nothing else today", message: "Schedule follow-ups from a lead's screen." },
  upcoming: { title: "Nothing planned", message: "Follow-ups for the coming days show here." },
  done: { title: "Nothing done yet", message: "Follow-ups you complete show here." },
};

/** Same views as the website's Follow-ups page. */
function paramsFor(view: FollowUpView, now: Date): FollowUpListParams {
  const { dayEnd } = localDayBounds(now);
  switch (view) {
    case "overdue":
      return { status: "pending", overdue: true };
    case "today":
      return { status: "pending", from: now.toISOString(), until: dayEnd };
    case "upcoming":
      return { status: "pending", from: dayEnd };
    case "done":
      return { status: "done", sort: "-completedAt" };
  }
}

export default function FollowUpsScreen() {
  const user = useCurrentUser();
  const manager = isManagerRole(user.role);
  const now = useNow();
  const [view, setView] = useState<FollowUpView>("today");
  const [team, setTeam] = useState(false);
  const [type, setType] = useState<FollowUpType | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [pickingAgent, setPickingAgent] = useState(false);
  const users = useAssignableUsers(manager && team);
  const agent = agentId ? users.data?.find((u) => u.id === agentId) : undefined;
  // Links (Home, alerts) open this tab on a given view, scope or agent (see lib/link-params.ts).
  const link = useLocalSearchParams<{ view?: string; scope?: string; assignedTo?: string; at?: string }>();
  const [appliedLink, setAppliedLink] = useState<string | undefined>(undefined);
  if (link.at && link.at !== appliedLink) {
    setAppliedLink(link.at);
    if (FOLLOW_UP_VIEWS.includes(link.view as FollowUpView)) setView(link.view as FollowUpView);
    setTeam(link.scope === "team" && manager);
    setAgentId(link.scope === "team" && manager ? (link.assignedTo ?? null) : null);
    setType(null);
  }
  const actions = useFollowUpActions();

  // `now` changes once a minute, which keeps the query key stable in between.
  const params = useMemo(
    () => ({
      ...paramsFor(view, now),
      scope: team ? ("all" as const) : ("mine" as const),
      ...(team && agentId && { assignedTo: agentId }),
      ...(type && { type }),
    }),
    [view, now, team, agentId, type],
  );
  const followUps = useFollowUps(params);
  const bounds = useMemo(() => localDayBounds(now), [now]);
  const summary = useFollowUpSummary({ ...bounds, team: team || undefined });

  const counts = team
    ? { overdue: summary.data?.teamOverdue, today: summary.data?.teamDueToday, upcoming: undefined }
    : { overdue: summary.data?.overdue, today: summary.data?.dueToday, upcoming: summary.data?.upcoming };

  const renderItem = useCallback(
    ({ item }: { item: FollowUp }) => (
      <FollowUpRow
        followUp={item}
        now={now}
        showAssignee={team}
        onComplete={actions.onComplete}
        onMore={actions.onMore}
      />
    ),
    [now, team, actions.onComplete, actions.onMore],
  );

  return (
    <>
      <InfiniteList
        items={flattenPages(followUps.data)}
        renderItem={renderItem}
        keyExtractor={(f) => f.id}
        isPending={followUps.isPending}
        error={followUps.error}
        onRetry={() => void followUps.refetch()}
        onRefresh={() => Promise.all([followUps.refetch(), summary.refetch()])}
        hasNextPage={followUps.hasNextPage}
        isFetchingNextPage={followUps.isFetchingNextPage}
        fetchNextPage={() => void followUps.fetchNextPage()}
        header={
          <>
            {manager && (
              <View style={styles.chips}>
                <Chip
                  label="Mine"
                  selected={!team}
                  onPress={() => {
                    setTeam(false);
                    setAgentId(null);
                  }}
                />
                <Chip
                  label="Whole team"
                  selected={team && !agentId}
                  onPress={() => {
                    setTeam(true);
                    setAgentId(null);
                  }}
                />
                <Chip
                  label={agent ? agent.name : "Agent…"}
                  icon="person-outline"
                  selected={!!agentId}
                  onPress={() => {
                    setTeam(true);
                    setPickingAgent(true);
                  }}
                />
              </View>
            )}
            <View style={styles.chips}>
              <Chip label="All types" selected={!type} onPress={() => setType(null)} />
              {FOLLOW_UP_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={followUpTypeLabels[t]}
                  icon={followUpTypeIcons[t]}
                  selected={type === t}
                  onPress={() => setType(type === t ? null : t)}
                />
              ))}
            </View>
            <SegmentedControl
              value={view}
              onChange={setView}
              segments={[
                { value: "overdue", label: "Overdue", count: counts.overdue, urgent: true },
                { value: "today", label: "Today", count: counts.today },
                { value: "upcoming", label: "Later", count: counts.upcoming },
                { value: "done", label: "Done" },
              ]}
            />
          </>
        }
        empty={<EmptyView icon="checkmark-done-outline" {...EMPTY[view]} />}
      />
      {actions.sheets}
      {manager && (
        <UserPickerSheet
          open={pickingAgent}
          onClose={() => setPickingAgent(false)}
          title="Follow-ups of"
          value={agentId}
          onSelect={(id) => {
            setAgentId(id);
            setPickingAgent(false);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
