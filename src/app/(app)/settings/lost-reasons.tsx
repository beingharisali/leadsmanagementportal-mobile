import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useUpdateLostReasons, useWorkspaceSettings } from "@/features/customization/hooks";
import { SETTINGS_LIMITS } from "@/features/customization/types";
import { RowInput } from "@/features/settings/components/row-input";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Owners and admins: quick picks shown when a lead is marked as lost. Agents can still type their own. */
export default function LostReasonsScreen() {
  const settings = useWorkspaceSettings().data;
  return (
    <Screen>
      <AppText muted>Quick picks shown when a lead is marked as lost. Agents can still type their own reason.</AppText>
      <Card>
        {settings ? (
          <LostReasonsForm key={settings.lostReasons.join("\n")} saved={settings.lostReasons} />
        ) : (
          <AppText muted>Loading…</AppText>
        )}
      </Card>
    </Screen>
  );
}

function LostReasonsForm({ saved }: { saved: string[] }) {
  const { colors } = useTheme();
  const update = useUpdateLostReasons();
  const [reasons, setReasons] = useState(saved);
  const [draft, setDraft] = useState("");
  const dirty = reasons.join("\n") !== saved.join("\n");

  function add() {
    const reason = draft.trim();
    if (reason.length < 3) return Alert.alert("Too short", "A reason needs at least 3 characters.");
    if (reasons.some((r) => r.toLowerCase() === reason.toLowerCase())) return Alert.alert("Already in the list");
    setReasons([...reasons, reason]);
    setDraft("");
  }

  return (
    <View style={styles.wrapper}>
      {reasons.length === 0 ? (
        <AppText muted>No quick picks. Agents type a reason each time.</AppText>
      ) : (
        <View style={styles.chips}>
          {reasons.map((reason) => (
            <Pressable
              key={reason}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${reason}`}
              onPress={() => setReasons(reasons.filter((r) => r !== reason))}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <AppText variant="small">{reason}</AppText>
              <Ionicons name="close" size={14} color={colors.mutedText} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.addRow}>
        <RowInput
          value={draft}
          onChangeText={setDraft}
          maxLength={100}
          placeholder="e.g. Chose a cheaper vendor"
          accessibilityLabel="New lost reason"
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Button
          title="Add"
          variant="secondary"
          icon="add"
          disabled={!draft.trim() || reasons.length >= SETTINGS_LIMITS.lostReasons}
          onPress={add}
          style={styles.addButton}
        />
      </View>
      <Button
        title="Save reasons"
        loading={update.isPending}
        disabled={!dirty}
        onPress={() =>
          update.mutate(reasons, {
            onSuccess: () => Alert.alert("Lost reasons saved"),
            onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addButton: { minHeight: 40, paddingHorizontal: spacing.md },
});
