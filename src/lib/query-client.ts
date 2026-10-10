import { focusManager, MutationCache, onlineManager, QueryCache, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, Platform } from "react-native";

import { ApiClientError } from "./api-client";
import { showUpgradePrompt } from "./upgrade-prompt";

/**
 * Plan limits and missing features open the upgrade message; a workspace that
 * just went read-only refreshes the profile so its banner shows. Same as the website.
 */
function handlePlanError(error: unknown, { prompt }: { prompt: boolean }) {
  if (!(error instanceof ApiClientError)) return;
  if (prompt && (error.code === "PLAN_LIMIT_REACHED" || error.code === "FEATURE_NOT_IN_PLAN")) {
    showUpgradePrompt({ message: error.message, details: error.details });
  } else if (error.code === "ACCOUNT_READ_ONLY") {
    void queryClient.invalidateQueries({ queryKey: authKeys.me });
  }
}

export const queryClient = new QueryClient({
  // Actions already explain their own failure in an alert (with the API's plan message), so only loads prompt.
  queryCache: new QueryCache({ onError: (error) => handlePlanError(error, { prompt: true }) }),
  mutationCache: new MutationCache({ onError: (error) => handlePlanError(error, { prompt: false }) }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Errors the user can't fix by retrying (signed out, not allowed, not found) aren't retried.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiClientError && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});

export const authKeys = {
  me: ["auth", "me"] as const,
};

// React Query only knows about browser focus/online events; teach it the phone's.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => setOnline(!!state.isConnected));
  return () => subscription.remove();
});

// Coming back to the app counts as "focus": stale screens refresh.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
}
