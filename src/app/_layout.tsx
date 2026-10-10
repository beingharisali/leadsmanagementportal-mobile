import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { StartupScreen } from "@/components/startup-screen";
import { appConfigApi, compareVersions } from "@/features/app-config/api";
import { UpdateRequired } from "@/features/app-config/update-required";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { APP_VERSION } from "@/lib/config";
import { queryClient } from "@/lib/query-client";
import { palettes } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Navigation colours follow the phone's light / dark mode. */
function ThemedApp() {
  const { scheme } = useTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const colors = palettes[scheme];
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
        },
      }}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </ThemeProvider>
  );
}

/**
 * Before anything else: is this app version still supported, and is there a
 * saved sign-in? Then the signed-out screens or the app, never both.
 */
function RootNavigator() {
  const { status, user, restoreError, retryRestore } = useAuth();
  const config = useQuery({ queryKey: ["mobile-config"], queryFn: appConfigApi.get, staleTime: Infinity });

  if (config.error) return <StartupScreen error={config.error} onRetry={() => void config.refetch()} />;
  if (config.data && compareVersions(APP_VERSION, config.data.minimumVersion) < 0) {
    return <UpdateRequired config={config.data} />;
  }
  if (restoreError) return <StartupScreen error={restoreError} onRetry={retryRestore} />;
  if (!config.data || status === "restoring" || (status === "signedIn" && !user)) return <StartupScreen />;

  const signedIn = status === "signedIn";
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
