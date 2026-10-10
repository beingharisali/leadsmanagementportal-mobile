import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, StyleSheet } from "react-native";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { authApi } from "@/features/auth/api";
import { getErrorMessage } from "@/lib/api-client";
import { authKeys } from "@/lib/query-client";
import { getViewAs, setViewAs, useViewAsTarget, type ViewAsTarget } from "@/lib/view-as";

/**
 * Enter / leave "view as agent". Everything cached belongs to whoever the API
 * answered as, so it's reloaded on each switch. The profile is fetched first,
 * so the app switches in place without going back to the start-up screen.
 */
export function useViewAsControls() {
  const queryClient = useQueryClient();

  async function switchTo(target: ViewAsTarget | null) {
    const previous = getViewAs();
    setViewAs(target);
    try {
      const me = await authApi.me();
      queryClient.setQueryData(authKeys.me, me);
      await queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      return true;
    } catch (error) {
      setViewAs(previous);
      Alert.alert("Couldn't switch the view", getErrorMessage(error));
      return false;
    }
  }

  return {
    async start(target: ViewAsTarget) {
      if (await switchTo(target)) router.navigate("/");
    },
    async exit() {
      const target = getViewAs();
      if (!(await switchTo(null))) return;
      router.navigate("/more");
      if (target) router.push({ pathname: "/monitoring/[userId]", params: { userId: target.id } });
    },
  };
}

/** Shown at the top of every screen while a manager is viewing as an agent. */
export function ViewAsBanner() {
  const target = useViewAsTarget();
  const { exit } = useViewAsControls();
  if (!target) return null;
  return (
    <Banner
      tone="warning"
      title={`Viewing as ${target.name}`}
      message="Read-only: you see exactly what they see, and changes are turned off."
    >
      <Button title="Exit view" variant="ghost" icon="exit-outline" onPress={() => void exit()} style={styles.button} />
    </Banner>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: "flex-start", minHeight: 32, paddingHorizontal: 0 },
});
