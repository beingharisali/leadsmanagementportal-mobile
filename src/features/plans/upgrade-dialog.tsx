import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Modal, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { isManagerRole } from "@/features/users/types";
import { showUpgradePrompt, useUpgradePrompt } from "@/lib/upgrade-prompt";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { planLabels, type PlanKey } from "./types";

/**
 * Shown when the API refuses something because of the plan: a limit is
 * reached (users, leads, storage) or a feature isn't included. Mounted once
 * for the signed-in app.
 */
export function UpgradeDialog() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const prompt = useUpgradePrompt();
  const manager = user ? isManagerRole(user.role) : false;
  const upgradeTo = prompt?.details?.upgradeTo as PlanKey | null | undefined;
  const close = () => showUpgradePrompt(null);

  return (
    <Modal visible={prompt !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]} accessibilityRole="alert">
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="rocket-outline" size={22} color={colors.primary} />
          </View>
          <AppText variant="heading">
            {upgradeTo
              ? `Upgrade to ${planLabels[upgradeTo]}`
              : prompt?.details?.feature
                ? "Not included in your plan"
                : "Your plan's limit is reached"}
          </AppText>
          <AppText muted>{prompt?.message}</AppText>
          {!manager && <AppText muted>Ask your admin to upgrade the plan.</AppText>}
          <View style={styles.buttons}>
            <Button title="Not now" variant="secondary" onPress={close} style={styles.flex} />
            {manager && (
              <Button
                title="See plans"
                onPress={() => {
                  close();
                  router.push("/settings/plan");
                }}
                style={styles.flex}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  dialog: { width: "100%", maxWidth: 400, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
