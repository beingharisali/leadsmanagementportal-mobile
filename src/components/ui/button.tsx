import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>["name"];
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style }: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { background: colors.primary, text: colors.primaryText, border: colors.primary },
    secondary: { background: colors.card, text: colors.text, border: colors.border },
    ghost: { background: "transparent", text: colors.primary, border: "transparent" },
    danger: { background: colors.danger, text: "#FFFFFF", border: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
        (pressed || inactive) && { opacity: inactive ? 0.55 : 0.8 },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          icon && <Ionicons name={icon} size={18} color={palette.text} />
        )}
        <AppText variant="label" weight="600" color={palette.text}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
});
