import { useCallback, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { OptionList } from "@/components/ui/option-list";
import { Sheet } from "@/components/ui/sheet";
import { EmptyView } from "@/components/ui/state-views";
import { ActivityItem } from "@/features/activities/components/activity-item";
import { actionLabels } from "@/features/activities/format";
import { useActivities, type ActivityListParams } from "@/features/activities/hooks";
import type { Activity, ActivityAction } from "@/features/activities/types";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { flattenPages } from "@/lib/infinite";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const ENTITY_FILTERS: { value: ActivityListParams["entityType"]; label: string }[] = [
  { value: undefined, label: "Everything" },
  { value: "lead", label: "Leads" },
  { value: "user", label: "People" },
];
const ALL_ACTIONS = "all";

/** Owners and admins: every change to a lead or a team member, and every sign-in. Updates live. */
export default function ActivityFeedScreen() {
  const { colors } = useTheme();
  const [entityType, setEntityType] = useState<ActivityListParams["entityType"]>();
  const [action, setAction] = useState<ActivityAction>();
  const [actor, setActor] = useState<string | null>(null);
  const [showPresence, setShowPresence] = useState(true);
  const [pickingAction, setPickingAction] = useState(false);
  const [pickingActor, setPickingActor] = useState(false);
  const users = useAssignableUsers();
  const actorName = actor ? users.data?.find((u) => u.id === actor)?.name : undefined;

  const activities = useActivities({
    entityType,
    action,
    actor: actor ?? undefined,
    excludeTracking: showPresence ? undefined : true,
  });

  const renderItem = useCallback(({ item }: { item: Activity }) => <ActivityItem activity={item} showEntity />, []);

  return (
    <>
      <InfiniteList
        items={flattenPages(activities.data)}
        renderItem={renderItem}
        keyExtractor={(a) => a.id}
        isPending={activities.isPending}
        error={activities.error}
        onRetry={() => void activities.refetch()}
        onRefresh={() => activities.refetch()}
        hasNextPage={activities.hasNextPage}
        isFetchingNextPage={activities.isFetchingNextPage}
        fetchNextPage={() => void activities.fetchNextPage()}
        header={
          <>
            <View style={styles.chips}>
              {ENTITY_FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={entityType === f.value} onPress={() => setEntityType(f.value)} />
              ))}
            </View>
            <View style={styles.chips}>
              <Chip
                label={action ? actionLabels[action] : "Any action"}
                icon="funnel-outline"
                selected={!!action}
                onPress={() => setPickingAction(true)}
              />
              <Chip
                label={actorName ?? "Anyone"}
                icon="person-outline"
                selected={!!actor}
                onPress={() => setPickingActor(true)}
              />
            </View>
            <View style={styles.switchRow}>
              <AppText variant="small" style={styles.flex}>
                Show sign-ins & lead opens
              </AppText>
              <Switch
                value={showPresence}
                onValueChange={setShowPresence}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Show sign-ins and lead opens"
              />
            </View>
          </>
        }
        empty={
          <EmptyView
            icon="time-outline"
            title="No activity yet"
            message="Every change to a lead or a team member, and every sign-in, is recorded here."
          />
        }
      />
      <Sheet open={pickingAction} onClose={() => setPickingAction(false)} title="Show only">
        <OptionList<ActivityAction | typeof ALL_ACTIONS>
          options={[
            { value: ALL_ACTIONS, label: "Any action" },
            ...(Object.keys(actionLabels) as ActivityAction[]).map((a) => ({ value: a, label: actionLabels[a] })),
          ]}
          value={action ?? ALL_ACTIONS}
          onSelect={(value) => {
            setAction(value === ALL_ACTIONS ? undefined : value);
            setPickingAction(false);
          }}
        />
      </Sheet>
      <UserPickerSheet
        open={pickingActor}
        onClose={() => setPickingActor(false)}
        title="Done by"
        subtitle="“Nobody” shows everyone's activity."
        value={actor}
        onSelect={(id) => {
          setActor(id);
          setPickingActor(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
