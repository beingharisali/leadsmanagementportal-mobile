import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
}

/** A tappable pill for choosing options: filters, presets, call outcomes. */
export function Chip({ label, selected, onPress, icon, disabled }: ChipProps) {
  const { colors } = useTheme();
  const foreground = selected ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.75 },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={foreground} />}
      <AppText variant="small" weight={selected ? "600" : "500"} color={foreground}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
