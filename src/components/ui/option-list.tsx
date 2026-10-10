import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface Option<T extends string> {
  value: T;
  label: string;
  /** e.g. a coloured dot */
  leading?: ReactNode;
}

interface OptionListProps<T extends string> {
  options: Option<T>[];
  value: T | null | undefined;
  onSelect: (value: T) => void;
}

/** A list of choices with a tick on the current one, for use inside a sheet. */
export function OptionList<T extends string>({ options, value, onSelect }: OptionListProps<T>) {
  const { colors } = useTheme();
  return (
    <View>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            {option.leading}
            <AppText style={styles.label} weight={selected ? "600" : undefined} color={selected ? colors.primary : undefined}>
              {option.label}
            </AppText>
            {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingVertical: spacing.sm },
  label: { flex: 1 },
});
