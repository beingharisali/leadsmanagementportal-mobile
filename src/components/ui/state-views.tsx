import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Button } from "./button";

export function LoadingView({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {message && (
        <AppText muted style={styles.text}>
          {message}
        </AppText>
      )}
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedText} />
      <AppText style={styles.text}>{getErrorMessage(error)}</AppText>
      {onRetry && <Button title="Try again" variant="secondary" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

export function EmptyView({
  icon = "file-tray-outline",
  title,
  message,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.mutedText} />
      <AppText variant="heading" style={styles.text}>
        {title}
      </AppText>
      {message && (
        <AppText muted style={styles.text}>
          {message}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  text: { textAlign: "center" },
});
