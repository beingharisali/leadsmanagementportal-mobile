import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface HeaderButtonProps {
  label: string;
  onPress: () => void;
  /** Icon-only when given; `label` is then read out by screen readers */
  icon?: ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
}

/** A button for the right side of a screen header. */
export function HeaderButton({ label, onPress, icon, disabled }: HeaderButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.5 }]}
    >
      {icon ? (
        <Ionicons name={icon} size={24} color={colors.primary} />
      ) : (
        <AppText variant="label" weight="600" color={colors.primary}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
