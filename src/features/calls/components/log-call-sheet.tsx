import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/api-client";
import { telUrl } from "@/lib/format";

import { useLogCall } from "../hooks";
import { toDurationInput } from "../types";
import { CallFields, callDraftError, emptyCallDraft, toCallPayload, type CallDraft } from "./call-fields";

type CallLead = { id: string; businessName: string; name: string; phone: string };

interface LogCallSheetProps {
  lead: CallLead;
  open: boolean;
  onClose: () => void;
  /** When the agent tapped Call: the duration counts up from then until they change it */
  startedAt?: number;
}

/** Save how a call went: right after dialling from the app, or for a call made some other way. */
export function LogCallSheet(props: LogCallSheetProps) {
  return <LogCallSheetBody key={useOpenKey(props.open)} {...props} />;
}

function elapsed(startedAt: number) {
  return toDurationInput(Math.round((Date.now() - startedAt) / 1000));
}

function LogCallSheetBody({ lead, open, onClose, startedAt }: LogCallSheetProps) {
  const mutation = useLogCall();
  const [draft, setDraft] = useState<CallDraft>(() => ({
    ...emptyCallDraft,
    duration: startedAt ? elapsed(startedAt) : "",
  }));
  const [durationEdited, setDurationEdited] = useState(false);

  // Count the call's length while the agent is on it, until they type their own.
  useEffect(() => {
    if (!open || !startedAt || durationEdited) return;
    const timer = setInterval(() => setDraft((d) => ({ ...d, duration: elapsed(startedAt) })), 1000);
    return () => clearInterval(timer);
  }, [open, startedAt, durationEdited]);

  const problem = callDraftError(draft);

  function save() {
    mutation.mutate(
      { leadId: lead.id, ...toCallPayload(draft) },
      {
        onSuccess: onClose,
        onError: (error) => Alert.alert("Couldn't save the call", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log call"
      subtitle={`${lead.businessName} · ${lead.name}`}
      footer={
        <>
          <Button title="Save call" icon="checkmark" loading={mutation.isPending} disabled={!!problem} onPress={save} />
          {startedAt && (
            <Button title="Call again" variant="ghost" icon="call-outline" onPress={() => void Linking.openURL(telUrl(lead.phone))} />
          )}
        </>
      }
    >
      <CallFields
        draft={draft}
        onChange={(next) => {
          if (next.duration !== draft.duration) setDurationEdited(true);
          setDraft(next);
        }}
        durationHint={startedAt && !durationEdited ? "Counting since you tapped Call. Type to change it." : undefined}
      />
    </Sheet>
  );
}
