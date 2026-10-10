import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Sheet } from "@/components/ui/sheet";
import { COLOR_NAMES, type ColorName } from "@/features/customization/types";
import { accentColor } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** A colour swatch; tap to pick another from the company palette. */
export function ColorPicker({ value, onChange, label }: { value: ColorName; onChange: (color: ColorName) => void; label: string }) {
  const { scheme, colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Tap to change`}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={[styles.swatch, { backgroundColor: accentColor(value, scheme), borderColor: colors.border }]}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.grid}>
          {COLOR_NAMES.map((name) => (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ checked: name === value }}
              accessibilityLabel={name}
              onPress={() => {
                onChange(name);
                setOpen(false);
              }}
              style={[styles.option, { backgroundColor: accentColor(name, scheme) }]}
            >
              {name === value && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center", paddingVertical: spacing.sm },
  option: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
