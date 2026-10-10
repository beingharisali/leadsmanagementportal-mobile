import { Stack } from "expo-router";

/** Signed in: the tabs, with other screens opening on top of them. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: "My account" }} />
      <Stack.Screen name="soon" />
      <Stack.Screen name="leads/[id]/index" options={{ title: "" }} />
      <Stack.Screen name="leads/[id]/edit" options={{ title: "Edit lead" }} />
      <Stack.Screen name="leads/new" options={{ title: "Add lead" }} />
      <Stack.Screen name="pipeline" options={{ title: "Pipeline" }} />
      <Stack.Screen name="handovers" options={{ title: "Handover requests" }} />
    </Stack>
  );
}
