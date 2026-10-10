import { Stack, useLocalSearchParams } from "expo-router";

import { EmptyView } from "@/components/ui/state-views";
import { Screen } from "@/components/ui/screen";

/** Placeholder for screens that arrive in later updates. */
export default function ComingSoonScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return (
    <Screen>
      <Stack.Screen options={{ title: title ?? "Coming soon" }} />
      <EmptyView
        icon="construct-outline"
        title="Coming in a later update"
        message="This part of GetCloseWise is being built for phones. For now, use it on the website."
      />
    </Screen>
  );
}
