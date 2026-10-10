import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { OfflineBanner } from "@/components/offline-banner";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

interface ScreenProps {
  children: ReactNode;
  /** Pull-to-refresh; the spinner shows until the promise settles */
  onRefresh?: () => Promise<unknown>;
  /** Screens under a header or above the tab bar don't need those edges padded */
  edges?: Edge[];
}

/** A scrolling page in the theme's background, with keyboard avoidance for forms. */
export function Screen({ children, onRefresh, edges = ["left", "right"] }: ScreenProps) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          <OfflineBanner />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
});
