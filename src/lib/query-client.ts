import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, Platform } from "react-native";

import { ApiClientError } from "./api-client";

export const queryClient = new QueryClient({
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
