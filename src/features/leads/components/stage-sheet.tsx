import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { OptionList } from "@/components/ui/option-list";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useLeadOptions } from "@/features/customization/hooks";
import { LOST_STAGE } from "@/features/customization/types";
import { fieldError, getErrorMessage } from "@/lib/api-client";
import { accentColor } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useChangeLeadStatus } from "../hooks";
import type { Lead } from "../types";

interface StageSheetProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

/**
 * Move a lead to another stage. Lost, and a stage that closes as Lost the next
 * day (e.g. "Not Interested"), ask for a reason first, like the website.
 */
export function StageSheet(props: StageSheetProps) {
  return <StageSheetBody key={useOpenKey(props.open)} {...props} />;
}

function StageSheetBody({ lead, open, onClose }: StageSheetProps) {
  const { scheme } = useTheme();
  const { stages, stageLabel, lostReasons, needsLostReason } = useLeadOptions();
  const mutation = useChangeLeadStatus(lead.id);
  /** The stage waiting for a reason */
  const [askingReason, setAskingReason] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function submit(status: string, lostReason?: string) {
    mutation.mutate(
      { status, lostReason },
      {
        onSuccess: onClose,
        onError: (error) => {
          if (!fieldError(error, "lostReason")) Alert.alert("Couldn't change the stage", getErrorMessage(error));
        },
      },
    );
  }

  function select(status: string) {
    if (status === lead.status) return onClose();
    if (needsLostReason(status)) setAskingReason(status);
    else submit(status);
  }

  if (askingReason) {
    const toLost = askingReason === LOST_STAGE;
    const action = toLost ? `Mark as ${stageLabel(LOST_STAGE)}` : `Move to ${stageLabel(askingReason)}`;
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={action}
        subtitle={
          toLost
            ? `Why was ${lead.businessName} lost? This helps the team see what to improve.`
            : `Why isn't ${lead.businessName} interested? Tomorrow the lead moves to ${stageLabel(LOST_STAGE)} with this reason.`
        }
        footer={
          <Button
            title={action}
            variant="danger"
            loading={mutation.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => submit(askingReason, reason.trim())}
          />
        }
      >
        {lostReasons.length > 0 && (
          <View style={styles.chips}>
            {lostReasons.map((item) => (
              <Chip key={item} label={item} selected={reason === item} onPress={() => setReason(item)} />
            ))}
          </View>
        )}
        <TextField
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Went with a cheaper option"
          multiline
          maxLength={500}
          error={fieldError(mutation.error, "lostReason")}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Move to stage" subtitle={lead.businessName}>
      {mutation.isPending && (
        <AppText variant="small" muted>
          Saving…
        </AppText>
      )}
      <OptionList
        options={stages.map((stage) => ({
          value: stage.key,
          label: stage.label,
          leading: <View style={[styles.dot, { backgroundColor: accentColor(stage.color, scheme) }]} />,
        }))}
        value={lead.status}
        onSelect={select}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
});
