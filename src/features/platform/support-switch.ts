import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

import { useAuth } from "@/features/auth/auth-provider";
import { apiClient } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token-storage";

import { startSupportSession } from "./hooks";

/**
 * Support sessions in the app. The website swaps cookies; the app keeps the
 * staff member's own token aside, signs in with the support token, and
 * switches back on exit (or signs out if the staff token is gone).
 */
const RETURN_KEY = "getclosewise.support-return-token";

export function useSupportSwitch() {
  const { signIn, signOut } = useAuth();

  return {
    /** Signs in as the customer, read-only, for up to an hour. */
    async start(payload: { organizationId: string; userId?: string; reason: string }) {
      const { token } = await startSupportSession(payload);
      const own = await tokenStorage.get();
      if (own) await SecureStore.setItemAsync(RETURN_KEY, own);
      // Nothing cached for the staff account carries over into the customer's workspace.
      queryClient.clear();
      await signIn(token);
      router.replace("/");
    },

    /** Ends the session and returns to the staff account. */
    async exit() {
      await apiClient.post("/auth/support/exit").catch(() => undefined);
      const own = await SecureStore.getItemAsync(RETURN_KEY).catch(() => null);
      await SecureStore.deleteItemAsync(RETURN_KEY).catch(() => undefined);
      queryClient.clear();
      if (!own) return signOut();
      try {
        await signIn(own);
        router.replace("/");
      } catch {
        await signOut();
      }
    },
  };
}
