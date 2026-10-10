import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { moreSectionsFor } from "@/config/navigation";
import { useAuth, useCurrentUser } from "@/features/auth/auth-provider";
import { usePendingReassignmentCount } from "@/features/reassignments/hooks";
import { isManagerRole, userRoleLabels } from "@/features/users/types";
import { APP_VERSION } from "@/lib/config";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function MoreScreen() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const features = user.organization?.features ?? [];
  const pendingHandovers = usePendingReassignmentCount(isManagerRole(user.role)).data ?? 0;

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need your email and password to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <Card style={styles.flush}>
        <ListRow
          icon="person-circle-outline"
          title={user.name}
          subtitle={`${userRoleLabels[user.role]} · ${user.email}`}
          onPress={() => router.push("/account")}
        />
      </Card>

      {moreSectionsFor(user).map((section) => (
        <View key={section.label} style={styles.section}>
          <AppText variant="small" muted style={styles.sectionLabel}>
            {section.label.toUpperCase()}
          </AppText>
          <Card style={styles.flush}>
            {section.items.map((item, index) => (
              <View key={item.title} style={index > 0 && [styles.divider, { borderTopColor: colors.border }]}>
                <ListRow
                  icon={item.icon}
                  title={item.title}
                  trailingIcon={item.feature && !features.includes(item.feature) ? "lock-closed" : undefined}
                  subtitle={
                    item.href === "/handovers" && pendingHandovers ? `${pendingHandovers} waiting for you` : item.subtitle
                  }
                  onPress={() => {
                    if (item.feature && !features.includes(item.feature)) {
                      Alert.alert("Not included in your plan", `${item.title} comes with a higher plan. The owner can upgrade on the website.`);
                    } else if (item.href) router.push(item.href);
                    else router.push({ pathname: "/soon", params: { title: item.title } });
                  }}
                />
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Card style={styles.flush}>
        <ListRow icon="log-out-outline" title="Sign out" destructive onPress={confirmSignOut} />
      </Card>

      <AppText variant="small" muted style={styles.version}>
        GetCloseWise {APP_VERSION}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flush: { padding: 0, gap: 0, overflow: "hidden" },
  section: { gap: spacing.sm },
  sectionLabel: { paddingHorizontal: spacing.xs, letterSpacing: 0.5 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  version: { textAlign: "center" },
});
