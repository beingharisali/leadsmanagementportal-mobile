import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { localDayBounds } from "@/features/follow-ups/format";
import { followUpKeys, useFollowUpSummary } from "@/features/follow-ups/hooks";
import type { FollowUpView } from "@/features/follow-ups/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { WorkspaceBanners } from "@/features/organizations/workspace-banners";
import { planLabels } from "@/features/plans/types";
import { userRoleLabels } from "@/features/users/types";
import { greeting } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { authKeys } from "@/lib/query-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function HomeScreen() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const organization = user.organization;

  return (
    <Screen
      onRefresh={() =>
        Promise.all([
          queryClient.refetchQueries({ queryKey: authKeys.me }),
          queryClient.refetchQueries({ queryKey: followUpKeys.all }),
        ])
      }
    >
      <View style={styles.header}>
        <AppText variant="title">
          {greeting()}, {user.name.split(" ")[0]}
        </AppText>
        {organization && (
          <AppText muted>
            {organization.name} · {userRoleLabels[user.role]}
          </AppText>
        )}
      </View>

      <WorkspaceBanners user={user} />

      <TodayCard />

      {organization && (
        <Card>
          <AppText variant="label" muted>
            Plan
          </AppText>
          <AppText variant="heading">
            {planLabels[organization.plan]}
            {organization.billingStatus === "trial" ? " · Free trial" : ""}
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

/** Today's follow-ups at a glance; each number opens the Follow-ups tab. */
function TodayCard() {
  const canEdit = useCanEdit();
  const now = useNow();
  const bounds = useMemo(() => localDayBounds(now), [now]);
  const summary = useFollowUpSummary(bounds);
  const data = summary.data;

  return (
    <Card>
      <AppText variant="heading">Today</AppText>
      {summary.error && !data ? (
        <AppText muted>Couldn't load your follow-ups. Pull down to try again.</AppText>
      ) : (
        <View style={styles.stats}>
          <Stat label="Overdue" value={data?.overdue} view="overdue" urgent />
          <Stat label="Still due today" value={data?.dueToday} view="today" />
          <Stat label="Done today" value={data?.doneToday} view="done" />
        </View>
      )}
      {data && data.overdue === 0 && data.dueToday === 0 && (
        <AppText variant="small" muted>
          Nothing due right now. Plan follow-ups from a lead's screen so nobody is forgotten.
        </AppText>
      )}
      <View style={styles.buttons}>
        <Button title="Follow-ups" variant="secondary" icon="alarm-outline" onPress={() => router.navigate("/follow-ups")} style={styles.flex} />
        {canEdit && (
          <Button title="Add lead" variant="secondary" icon="add" onPress={() => router.push("/leads/new")} style={styles.flex} />
        )}
      </View>
    </Card>
  );
}

function Stat({
  label,
  value,
  view,
  urgent,
}: {
  label: string;
  value: number | undefined;
  view: FollowUpView;
  urgent?: boolean;
}) {
  const { colors } = useTheme();
  const highlight = urgent && !!value;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? "loading"}`}
      onPress={() => router.navigate({ pathname: "/follow-ups", params: { view } })}
      style={[
        styles.stat,
        { backgroundColor: highlight ? colors.dangerSoft : colors.background, borderColor: highlight ? colors.danger : colors.border },
      ]}
    >
      <AppText variant="title" color={highlight ? colors.danger : undefined}>
        {value ?? "–"}
      </AppText>
      <AppText variant="small" muted numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  flex: { flex: 1 },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
