import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { OptionList } from "./option-list";
import { Sheet } from "./sheet";

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Adds a "None" choice that clears the value */
  clearable?: boolean;
  error?: string;
}

/** A form field that opens a list of choices in a sheet. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  clearable,
  error,
}: SelectFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const choices = clearable ? [{ value: "", label: "None" }, ...options] : options;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "not set"}`}
        onPress={() => setOpen(true)}
        style={[styles.box, { backgroundColor: colors.input, borderColor: error ? colors.danger : colors.border }]}
      >
        <AppText style={styles.flex} muted={!selected} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
      </Pressable>
      {error && (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <OptionList
          options={choices}
          value={value}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  flex: { flex: 1 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
});
