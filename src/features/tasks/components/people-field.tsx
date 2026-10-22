import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useDepartmentName } from "@/features/departments/hooks";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { TaskPerson } from "../types";

/** A field that opens a sheet to pick one or more people, with search and their department. */
export function PeopleField({
  label,
  options,
  value,
  onChange,
  single,
  placeholder = "Pick people",
  error,
  loading,
}: {
  label: string;
  options: TaskPerson[];
  value: string[];
  onChange: (value: string[]) => void;
  single?: boolean;
  placeholder?: string;
  error?: string;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const departmentName = useDepartmentName();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const picked = options.filter((o) => value.includes(o.id));
  const query = search.trim().toLowerCase();
  const shown = options.filter((o) => !query || o.name.toLowerCase().includes(query));

  function toggle(id: string) {
    if (single) {
      onChange(value.includes(id) ? [] : [id]);
      setOpen(false);
    } else {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    }
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.box, { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.input }]}
      >
        <AppText style={styles.flex} muted={picked.length === 0} numberOfLines={2}>
          {picked.length === 0 ? placeholder : picked.map((p) => p.name).join(", ")}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
      </Pressable>
      {error && (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={!single ? <Button title="Done" icon="checkmark" onPress={() => setOpen(false)} /> : undefined}
      >
        <SearchField value={search} onChangeText={setSearch} placeholder="Search people" />
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {loading ? (
            <AppText muted>Loading…</AppText>
          ) : shown.length === 0 ? (
            <AppText muted>Nobody to pick.</AppText>
          ) : (
            shown.map((person) => {
              const selected = value.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggle(person.id)}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.primarySoft }]}
                >
                  <View style={styles.flex}>
                    <AppText>{person.name}</AppText>
                    <AppText variant="small" muted>
                      {departmentName(person.department)}
                    </AppText>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={selected ? colors.primary : colors.mutedText}
                  />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: spacing.xs + 2 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  list: { maxHeight: 360 },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
});
