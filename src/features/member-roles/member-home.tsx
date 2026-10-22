import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { AnnouncementBanners, VerifyEmailBanner } from "@/features/account/notices";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { WorkspaceBanners } from "@/features/organizations/workspace-banners";
import { TaskSummaryCard } from "@/features/tasks/components/task-summary-card";
import { greeting } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useRoleLabel } from "./hooks";

/**
 * Home for team members with a custom role (Developer, Designer…), same as the
 * website's. A simple start for now; each role's own dashboard comes later.
 */
export function MemberHome() {
  const user = useCurrentUser();
  const { colors } = useTheme();
  const roleLabel = useRoleLabel();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">
          {greeting()}, {user.name.split(" ")[0]}
        </AppText>
        {user.organization && <AppText muted>Welcome to {user.organization.name}.</AppText>}
      </View>

      <WorkspaceBanners user={user} />
      <AnnouncementBanners />
      <VerifyEmailBanner />

      <Card>
        <View style={styles.roleRow}>
          <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
          <AppText variant="heading">Your role</AppText>
          <Badge label={roleLabel(user)} color="indigo" />
        </View>
        <AppText muted>Your tasks are below. Notifications from your team show in the Alerts tab.</AppText>
      </Card>

      <TaskSummaryCard />

      <Card style={styles.flush}>
        <ListRow icon="clipboard-outline" title="Tasks" subtitle="Everything you're on" onPress={() => router.push("/tasks")} />
        <ListRow icon="folder-open-outline" title="Projects" subtitle="The projects you're on" onPress={() => router.push("/projects")} />
        <ListRow icon="person-circle-outline" title="My account" subtitle="Your name, phone and password" onPress={() => router.push("/account")} />
        <ListRow icon="notifications-outline" title="Alerts" subtitle="Messages from your team" onPress={() => router.navigate("/notifications")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  roleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  flush: { paddingVertical: spacing.xs },
});
