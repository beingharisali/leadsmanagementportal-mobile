import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** After this long, say why it's slow: the free server plan sleeps and needs up to a minute. */
const SLOW_AFTER_MS = 4_000;

/** Full-screen loading (or failure) while the app connects and restores the sign-in. */
export function StartupScreen({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { colors } = useTheme();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.brand}>
        <AppText variant="title" color={colors.primary}>
          GetCloseWise
        </AppText>
      </View>
      {error ? (
        <ErrorView error={error} onRetry={onRetry} />
      ) : (
        <LoadingView message={slow ? "Connecting to the server… this can take up to a minute the first time." : undefined} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brand: { alignItems: "center", paddingTop: spacing.xxl * 2 },
});
