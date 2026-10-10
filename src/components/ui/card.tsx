import { StyleSheet, View, type ViewProps } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View {...props} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]} />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
