import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { markInput } from "@/features/tracking/activity";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Chip } from "./chip";

interface TagsInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags offered while typing */
  suggestions?: string[];
  hint?: string;
}

const MAX_TAGS = 20;

/** Free-form tags: type and press return (or a comma); tap a tag's × to remove it. Same rules as the website. */
export function TagsInput({ label, value, onChange, suggestions = [], hint }: TagsInputProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().slice(0, 30);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setDraft("");
  }

  const query = draft.trim().toLowerCase();
  const matching = suggestions
    .filter((s) => !value.includes(s) && (!query || s.includes(query)))
    .slice(0, query ? 6 : 8);

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.box, { backgroundColor: colors.input, borderColor: colors.border }]}>
        {value.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onChange(value.filter((t) => t !== tag))}
            accessibilityRole="button"
            accessibilityLabel={`Remove tag ${tag}`}
            style={[styles.tag, { backgroundColor: colors.primarySoft }]}
          >
            <AppText variant="small" color={colors.primary} weight="500">
              {tag}
            </AppText>
            <Ionicons name="close" size={14} color={colors.primary} />
          </Pressable>
        ))}
        {value.length < MAX_TAGS && (
          <TextInput
            value={draft}
            onChangeText={(text) => {
              markInput();
              if (text.includes(",")) {
                text.split(",").slice(0, -1).forEach(add);
                setDraft(text.split(",").pop() ?? "");
              } else setDraft(text);
            }}
            onSubmitEditing={() => add(draft)}
            onBlur={() => draft.trim() && add(draft)}
            submitBehavior="submit"
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={value.length === 0 ? "Add a tag…" : ""}
            placeholderTextColor={colors.mutedText}
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel={label}
          />
        )}
      </View>
      {matching.length > 0 && (
        <View style={styles.suggestions}>
          {matching.map((tag) => (
            <Chip key={tag} label={tag} icon="add" onPress={() => add(tag)} />
          ))}
        </View>
      )}
      {hint && (
        <AppText variant="small" muted>
          {hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  box: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    minHeight: 48,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  input: { flexGrow: 1, minWidth: 100, fontSize: 16, paddingVertical: spacing.xs },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
