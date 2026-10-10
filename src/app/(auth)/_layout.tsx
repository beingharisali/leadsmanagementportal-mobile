import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerShadowVisible: false }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: "Create your company" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Forgot password" }} />
    </Stack>
  );
}
