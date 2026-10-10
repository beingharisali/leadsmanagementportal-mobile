import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

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
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
