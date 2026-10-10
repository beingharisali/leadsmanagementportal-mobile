import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { UpgradeDialog } from "@/features/plans/upgrade-dialog";
import { PushManager } from "@/features/push/push-manager";
import { markInput } from "@/features/tracking/activity";
import { PresenceTracker } from "@/features/tracking/presence-tracker";

/**
 * Signed in: the tabs, with other screens opening on top of them. Every
 * touch counts as activity for work-time tracking.
 */
export default function AppLayout() {
  return (
    <View style={styles.flex} onTouchStart={markInput}>
      <PresenceTracker />
      <UpgradeDialog />
      <PushManager />
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: "My account" }} />
        <Stack.Screen name="soon" />
        <Stack.Screen name="leads/[id]/index" options={{ title: "" }} />
        <Stack.Screen name="leads/[id]/edit" options={{ title: "Edit lead" }} />
        <Stack.Screen name="leads/new" options={{ title: "Add lead" }} />
        <Stack.Screen name="leads/import" options={{ title: "Import leads" }} />
        <Stack.Screen name="pipeline" options={{ title: "Pipeline" }} />
        <Stack.Screen name="handovers" options={{ title: "Handover requests" }} />
        <Stack.Screen name="recycle-bin" options={{ title: "Recycle bin" }} />
        <Stack.Screen name="team/index" options={{ title: "Team" }} />
        <Stack.Screen name="team/new" options={{ title: "Add member" }} />
        <Stack.Screen name="team/[id]" options={{ title: "Edit member" }} />
        <Stack.Screen name="activity" options={{ title: "Activity feed" }} />
        <Stack.Screen name="monitoring/index" options={{ title: "Live status" }} />
        <Stack.Screen name="monitoring/[userId]" options={{ title: "" }} />
        <Stack.Screen name="timesheets" options={{ title: "Timesheets" }} />
        <Stack.Screen name="performance" options={{ title: "Performance" }} />
        <Stack.Screen name="setup" options={{ title: "Setup" }} />
        <Stack.Screen name="settings/company" options={{ title: "Company" }} />
        <Stack.Screen name="settings/pipeline" options={{ title: "Pipeline" }} />
        <Stack.Screen name="settings/sources" options={{ title: "Lead sources" }} />
        <Stack.Screen name="settings/custom-fields" options={{ title: "Custom fields" }} />
        <Stack.Screen name="settings/tags" options={{ title: "Tags" }} />
        <Stack.Screen name="settings/lost-reasons" options={{ title: "Lost reasons" }} />
        <Stack.Screen name="settings/tracking" options={{ title: "Tracking" }} />
        <Stack.Screen name="settings/team-rules" options={{ title: "Team rules" }} />
        <Stack.Screen name="settings/templates/index" options={{ title: "Message templates" }} />
        <Stack.Screen name="settings/templates/edit" options={{ title: "Template" }} />
        <Stack.Screen name="settings/plan" options={{ title: "Plan & usage" }} />
        <Stack.Screen name="settings/billing" options={{ title: "Billing" }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
