import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { fieldError, getErrorMessage } from "@/lib/api-client";
import { useNow } from "@/lib/use-now";
import { spacing } from "@/theme/colors";

import { defaultDueAt, FOLLOW_UP_PRESETS, followUpTypeIcons, followUpTypeLabels, presetDate } from "../format";
import { useCreateFollowUp, useUpdateFollowUp } from "../hooks";
import { FOLLOW_UP_TYPES, type FollowUp, type FollowUpType } from "../types";

interface ScheduleSheetProps {
  lead: { id: string; businessName: string };
  open: boolean;
  onClose: () => void;
  /** Reschedule / edit this one instead of planning a new one */
  followUp?: FollowUp;
}

/** Plan the next call, meeting or message with a lead (or move an existing one). */
export function ScheduleSheet(props: ScheduleSheetProps) {
  return <ScheduleSheetBody key={useOpenKey(props.open)} {...props} />;
}

function ScheduleSheetBody({ lead, open, onClose, followUp }: ScheduleSheetProps) {
  const create = useCreateFollowUp();
  const update = useUpdateFollowUp();
  const mutation = followUp ? update : create;
  const now = useNow();

  const [type, setType] = useState<FollowUpType>(followUp?.type ?? "call");
  const [dueAt, setDueAt] = useState(() => (followUp ? new Date(followUp.dueAt) : defaultDueAt()));
  const [note, setNote] = useState(followUp?.note ?? "");
  const [location, setLocation] = useState(followUp?.location ?? "");

  const inPast = dueAt.getTime() < now.getTime() - 60_000;

  function save() {
    const payload = {
      type,
      dueAt: dueAt.toISOString(),
      note: note.trim(),
      location: type === "meeting" ? location.trim() : "",
    };
    const options = {
      onSuccess: onClose,
      onError: (error: unknown) => {
        if (!fieldError(error, "dueAt")) Alert.alert("Couldn't save the follow-up", getErrorMessage(error));
      },
    };
    if (followUp) update.mutate({ id: followUp.id, payload }, options);
    else create.mutate({ leadId: lead.id, ...payload }, options);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={followUp ? "Change follow-up" : "Schedule follow-up"}
      subtitle={lead.businessName}
      footer={
        <Button
          title={followUp ? "Save changes" : "Schedule"}
          icon="alarm-outline"
          loading={mutation.isPending}
          disabled={inPast}
          onPress={save}
        />
      }
    >
      <View style={styles.group}>
        <AppText variant="label">What</AppText>
        <View style={styles.chips}>
          {FOLLOW_UP_TYPES.map((value) => (
            <Chip
              key={value}
              label={followUpTypeLabels[value]}
              icon={followUpTypeIcons[value]}
              selected={type === value}
              onPress={() => setType(value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="label">When</AppText>
        <View style={styles.chips}>
          {FOLLOW_UP_PRESETS.map((preset) => (
            <Chip key={preset.label} label={preset.label} onPress={() => setDueAt(presetDate(preset.days, dueAt))} />
          ))}
        </View>
      </View>
      <DateTimeField
        label="Date and time"
        value={dueAt}
        onChange={setDueAt}
        minimumDate={now}
        error={inPast ? "Pick a time in the future" : fieldError(mutation.error, "dueAt")}
      />

      {type === "meeting" && (
        <TextField
          label="Where"
          value={location}
          onChangeText={setLocation}
          placeholder="Office address, or a video call link"
          maxLength={200}
        />
      )}
      <TextField
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Send the revised quote"
        multiline
        maxLength={300}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
