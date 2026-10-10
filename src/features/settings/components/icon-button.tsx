import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import { radius } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** A small icon-only button for list rows (move up / down, remove). */
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: disabled ? 0.3 : 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 34, height: 34, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
