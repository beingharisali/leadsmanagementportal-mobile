import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

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

import { useMoveLeadsByStatus } from "../hooks";

interface MoveStageSheetProps {
  open: boolean;
  onClose: () => void;
  /** The stage whose leads move */
  from: string;
  /** How many leads will move (already narrowed by the filters) */
  count: number;
  /** The pipeline's filters, sent along so only the leads on screen move */
  filters: { assignedTo?: string; assignedFrom?: string; assignedUntil?: string };
  filtered: boolean;
}

/**
 * Moves every lead in one stage to another. "Lost" asks for one reason that's
 * saved on each lead, like the website.
 */
export function MoveStageSheet(props: MoveStageSheetProps) {
  return <MoveStageSheetBody key={useOpenKey(props.open)} {...props} />;
}

function MoveStageSheetBody({ open, onClose, from, count, filters, filtered }: MoveStageSheetProps) {
  const { scheme } = useTheme();
  const { stages, stageLabel, lostReasons } = useLeadOptions();
  const mutation = useMoveLeadsByStatus();
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");
  const noun = `lead${count === 1 ? "" : "s"}`;

  function submit(to: string, lostReason?: string) {
    mutation.mutate(
      { from, to, lostReason, ...filters },
      {
        onSuccess: (result) => {
          onClose();
          Alert.alert(
            "Leads moved",
            `${result.moved} lead${result.moved === 1 ? "" : "s"} moved to ${stageLabel(to)}.`,
          );
        },
        onError: (error) => {
          if (!fieldError(error, "lostReason")) Alert.alert("Couldn't move the leads", getErrorMessage(error));
        },
      },
    );
  }

  function select(to: string) {
    if (to === from) return;
    if (to === LOST_STAGE) return setAskingReason(true);
    Alert.alert(
      `Move ${count} ${noun} to ${stageLabel(to)}?`,
      `${filtered ? "Only the leads matching your filters (agent and assigned date) move. " : ""}Every lead in ${stageLabel(from)} goes to ${stageLabel(to)}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Move", onPress: () => submit(to) },
      ],
    );
  }

  if (askingReason) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={`Mark ${count} ${noun} as ${stageLabel(LOST_STAGE)}`}
        subtitle={`Why were they lost? The reason is saved on every lead moved from ${stageLabel(from)}.`}
        footer={
          <Button
            title={`Mark ${count} ${noun} as ${stageLabel(LOST_STAGE)}`}
            variant="danger"
            loading={mutation.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => submit(LOST_STAGE, reason.trim())}
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
          placeholder="e.g. Campaign ended without a response"
          multiline
          maxLength={500}
          error={fieldError(mutation.error, "lostReason")}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Move all ${count} ${noun} to…`}
      subtitle={`From ${stageLabel(from)}${filtered ? ", matching your filters" : ""}`}
    >
      <OptionList
        options={stages
          .filter((stage) => stage.key !== from)
          .map((stage) => ({
            value: stage.key,
            label: stage.label,
            leading: <View style={[styles.dot, { backgroundColor: accentColor(stage.color, scheme) }]} />,
          }))}
        value={null}
        onSelect={select}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
});
