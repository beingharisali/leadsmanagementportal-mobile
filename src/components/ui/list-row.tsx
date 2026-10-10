import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  /** Shown on the right, e.g. a lock for a feature not in the plan */
  trailingIcon?: ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
}

/** One tappable row in a settings-style list. */
export function ListRow({ title, subtitle, icon, onPress, trailingIcon, destructive }: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
    >
      {icon && <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.primary} />}
      <View style={styles.text}>
        <AppText color={tint}>{title}</AppText>
        {subtitle && (
          <AppText variant="small" muted>
            {subtitle}
          </AppText>
        )}
      </View>
      {trailingIcon && <Ionicons name={trailingIcon} size={16} color={colors.mutedText} />}
      {onPress && !destructive && <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  text: { flex: 1, gap: 2 },
});
