import { useQueryClient } from "@tanstack/react-query";
import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { AnnouncementBanners, SampleDataBanner, VerifyEmailBanner } from "@/features/account/notices";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { GettingStartedCard, SetupBanner, StaleLeadsBanner } from "@/features/dashboard/components/dashboard-banners";
import { LeaderboardCard } from "@/features/dashboard/components/leaderboard-card";
import {
  LeadSourcesCard,
  LeadTemperatureCard,
  PipelineByStageCard,
  StatTiles,
} from "@/features/dashboard/components/lead-stats-cards";
import { RecentLeadsCard } from "@/features/dashboard/components/recent-leads-card";
import { MyTargetsCard } from "@/features/dashboard/components/targets-card";
import { TeamFollowUpsCard } from "@/features/dashboard/components/team-follow-ups-card";
import { TodayTasksCard } from "@/features/dashboard/components/today-tasks-card";
import { useLeadStats } from "@/features/leads/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { WorkspaceBanners } from "@/features/organizations/workspace-banners";
import { isManagerRole, userRoleLabels } from "@/features/users/types";
import { greeting } from "@/lib/format";
import { spacing } from "@/theme/colors";

/** The dashboard, same as the website's: today's work first, then the numbers. */
export default function HomeScreen() {
  const user = useCurrentUser();
  const manager = isManagerRole(user.role);
  const canEdit = useCanEdit();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const stats = useLeadStats();
  const organization = user.organization;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEdit
        ? () => <HeaderButton label="Add lead" icon="add-circle-outline" onPress={() => router.push("/leads/new")} />
        : undefined,
    });
  }, [navigation, canEdit]);

  return (
    <Screen onRefresh={() => queryClient.refetchQueries({ type: "active" })}>
      <View style={styles.header}>
        <AppText variant="title">
          {greeting()}, {user.name.split(" ")[0]}
        </AppText>
        <AppText muted>
          {organization ? `${organization.name} · ${userRoleLabels[user.role]} · ` : ""}
          {manager ? "every lead across the team" : "the leads assigned to you"}
        </AppText>
      </View>

      <WorkspaceBanners user={user} />
      <AnnouncementBanners />
      <VerifyEmailBanner />
      <SampleDataBanner />
      <SetupBanner />
      {manager && stats.data?.total === 0 && <GettingStartedCard />}
      <StaleLeadsBanner manager={manager} />

      <TodayTasksCard />
      {manager && <TeamFollowUpsCard />}
      {!manager && <MyTargetsCard />}
      <LeaderboardCard />

      {stats.data ? (
        <>
          <StatTiles stats={stats.data} manager={manager} />
          <PipelineByStageCard stats={stats.data} />
          <LeadSourcesCard stats={stats.data} />
          <LeadTemperatureCard stats={stats.data} />
        </>
      ) : stats.error ? (
        <AppText muted>Couldn&apos;t load your numbers. Pull down to try again.</AppText>
      ) : null}
      <RecentLeadsCard manager={manager} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
});
