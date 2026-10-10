import { useState } from "react";
import { Alert } from "react-native";

import { useCanEdit } from "@/features/organizations/hooks";
import { getErrorMessage } from "@/lib/api-client";

import { useCancelFollowUp } from "../hooks";
import type { FollowUp } from "../types";
import { CompleteSheet } from "./complete-sheet";
import { ScheduleSheet } from "./schedule-sheet";

/**
 * Done / Reschedule / Cancel for follow-up rows, with the sheets they open.
 * Render `sheets` once on the screen; pass the handlers to each row.
 * After a follow-up is done the agent is offered to plan the next one.
 */
export function useFollowUpActions() {
  const canEdit = useCanEdit();
  const cancel = useCancelFollowUp();
  const [completing, setCompleting] = useState<FollowUp | null>(null);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [planningFor, setPlanningFor] = useState<FollowUp["lead"] | null>(null);

  function confirmCancel(followUp: FollowUp) {
    Alert.alert("Cancel this follow-up?", "It will be removed from the list. The lead's history keeps a record.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel follow-up",
        style: "destructive",
        onPress: () =>
          cancel.mutate(followUp.id, {
            onError: (error) => Alert.alert("Couldn't cancel it", getErrorMessage(error)),
          }),
      },
    ]);
  }

  function onMore(followUp: FollowUp) {
    Alert.alert(followUp.lead.businessName, undefined, [
      { text: "Reschedule", onPress: () => setEditing(followUp) },
      { text: "Cancel follow-up", style: "destructive", onPress: () => confirmCancel(followUp) },
      { text: "Close", style: "cancel" },
    ]);
  }

  function onDone(done: FollowUp) {
    Alert.alert("Plan the next step?", `Schedule another follow-up with ${done.lead.businessName}.`, [
      { text: "Not now", style: "cancel" },
      { text: "Schedule", onPress: () => setPlanningFor(done.lead) },
    ]);
  }

  const sheets = (
    <>
      <CompleteSheet followUp={completing} onClose={() => setCompleting(null)} onDone={onDone} />
      {editing && (
        <ScheduleSheet lead={editing.lead} followUp={editing} open onClose={() => setEditing(null)} />
      )}
      {planningFor && <ScheduleSheet lead={planningFor} open onClose={() => setPlanningFor(null)} />}
    </>
  );

  return {
    onComplete: canEdit ? setCompleting : undefined,
    onMore: canEdit ? onMore : undefined,
    sheets,
  };
}
