import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { CallFields, callDraftError, emptyCallDraft, toCallPayload, type CallDraft } from "@/features/calls/components/call-fields";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { followUpTypeLabels } from "../format";
import { useCompleteFollowUp } from "../hooks";
import type { FollowUp } from "../types";

interface CompleteSheetProps {
  followUp: FollowUp | null;
  onClose: () => void;
  /** After it's saved, e.g. to offer planning the next one */
  onDone?: (followUp: FollowUp) => void;
}

/** Mark a follow-up done with what happened; for calls, log the call in the same step. */
export function CompleteSheet(props: CompleteSheetProps) {
  return <CompleteSheetBody key={useOpenKey(!!props.followUp)} {...props} />;
}

function CompleteSheetBody({ followUp, onClose, onDone }: CompleteSheetProps) {
  const { colors } = useTheme();
  const mutation = useCompleteFollowUp();
  const [outcome, setOutcome] = useState("");
  const [logCall, setLogCall] = useState(true);
  const [call, setCall] = useState<CallDraft>(emptyCallDraft);

  const isCall = followUp?.type === "call";
  const problem = isCall && logCall ? callDraftError(call) : null;

  function save() {
    if (!followUp) return;
    mutation.mutate(
      {
        id: followUp.id,
        payload: {
          outcome: outcome.trim() || undefined,
          call: isCall && logCall ? toCallPayload({ ...call, notes: outcome }) : undefined,
        },
      },
      {
        onSuccess: (done) => {
          onClose();
          onDone?.(done);
        },
        onError: (error) => Alert.alert("Couldn't complete the follow-up", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={!!followUp}
      onClose={onClose}
      title={`${followUp ? followUpTypeLabels[followUp.type] : ""} done`}
      subtitle={followUp ? `${followUp.lead.businessName}${followUp.note ? ` · ${followUp.note}` : ""}` : undefined}
      footer={
        <Button title="Mark as done" icon="checkmark-done" loading={mutation.isPending} disabled={!!problem} onPress={save} />
      }
    >
      <TextField
        label="What happened?"
        value={outcome}
        onChangeText={setOutcome}
        placeholder="e.g. Interested, wants a demo next week"
        multiline
        maxLength={2000}
        hint="Saved in the lead's history"
      />
      {isCall && (
        <>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: logCall }}
            onPress={() => setLogCall((v) => !v)}
            style={styles.switchRow}
          >
            <View style={styles.flex}>
              <AppText variant="label">Log the call too</AppText>
              <AppText variant="small" muted>
                Counts towards calls in reports
              </AppText>
            </View>
            <Switch
              value={logCall}
              onValueChange={setLogCall}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Log the call too"
            />
          </Pressable>
          {logCall && <CallFields draft={call} onChange={setCall} showNotes={false} />}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
});
