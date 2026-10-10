import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { spacing } from "@/theme/colors";

import { CALL_OUTCOMES, callOutcomeLabels, parseDuration, type CallLogPayload, type CallOutcome } from "../types";

export interface CallDraft {
  outcome: CallOutcome | null;
  /** "m:ss" or minutes */
  duration: string;
  notes: string;
}

export const emptyCallDraft: CallDraft = { outcome: null, duration: "", notes: "" };

/** What's wrong with the draft, or `null` when it can be saved. */
export function callDraftError(draft: CallDraft) {
  if (!draft.outcome) return "Pick how the call went";
  if (parseDuration(draft.duration) === null) return "Enter the duration as minutes, or m:ss";
  return null;
}

export function toCallPayload(draft: CallDraft): CallLogPayload {
  return {
    direction: "outbound",
    outcome: draft.outcome!,
    durationSeconds: parseDuration(draft.duration) ?? 0,
    notes: draft.notes.trim() || undefined,
  };
}

interface CallFieldsProps {
  draft: CallDraft;
  onChange: (draft: CallDraft) => void;
  /** Hide notes when the surrounding form has its own (completing a follow-up) */
  showNotes?: boolean;
  durationHint?: string;
}

/** Outcome, duration and notes: shared by "Log call" and completing a call follow-up. */
export function CallFields({ draft, onChange, showNotes = true, durationHint }: CallFieldsProps) {
  const durationInvalid = parseDuration(draft.duration) === null;
  return (
    <>
      <View style={styles.group}>
        <AppText variant="label">How did it go?</AppText>
        <View style={styles.chips}>
          {CALL_OUTCOMES.map((outcome) => (
            <Chip
              key={outcome}
              label={callOutcomeLabels[outcome]}
              selected={draft.outcome === outcome}
              onPress={() => onChange({ ...draft, outcome })}
            />
          ))}
        </View>
      </View>
      <TextField
        label="Duration"
        value={draft.duration}
        onChangeText={(duration) => onChange({ ...draft, duration })}
        placeholder="e.g. 4:30 or 5"
        keyboardType="numbers-and-punctuation"
        hint={durationHint ?? "Minutes, or minutes:seconds"}
        error={durationInvalid ? "Enter minutes, or m:ss" : undefined}
      />
      {showNotes && (
        <TextField
          label="Notes"
          value={draft.notes}
          onChangeText={(notes) => onChange({ ...draft, notes })}
          placeholder="What was discussed?"
          multiline
          maxLength={2000}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
