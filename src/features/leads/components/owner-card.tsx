import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import {
  useCancelReassignment,
  useRequestReassignment,
  useReassignments,
} from "@/features/reassignments/hooks";
import { UNASSIGNED, UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { isManagerRole } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";

import { useAssignLead } from "../hooks";
import type { Lead } from "../types";

/**
 * Who works this lead. Managers can give it to someone else; the agent who
 * has it can ask their admin to hand it over.
 */
export function OwnerCard({ lead, canWrite }: { lead: Lead; canWrite: boolean }) {
  const user = useCurrentUser();
  const manager = isManagerRole(user.role);
  const assign = useAssignLead(lead.id);
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState(false);

  const mine = lead.assignedTo?.id === user.id;
  const pendingQuery = useReassignments({ leadId: lead.id, status: "pending", limit: 1 }, !manager && mine);
  const pending = flattenPages(pendingQuery.data)[0];
  const cancel = useCancelReassignment();

  function pick(assigneeId: string | null) {
    if (assigneeId === (lead.assignedTo?.id ?? null)) return setPicking(false);
    assign.mutate(assigneeId, {
      onSuccess: () => setPicking(false),
      onError: (error) => Alert.alert("Couldn't assign the lead", getErrorMessage(error)),
    });
  }

  function confirmCancel() {
    if (!pending) return;
    Alert.alert("Cancel your handover request?", "The lead stays with you.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: () => cancel.mutate(pending.id, { onError: (error) => Alert.alert("Couldn't cancel it", getErrorMessage(error)) }),
      },
    ]);
  }

  return (
    <Card>
      <AppText variant="heading">Owner</AppText>
      <View>
        <AppText weight="600">
          {lead.assignedTo ? lead.assignedTo.name : "Unassigned"}
          {lead.assignedTo?.isActive === false ? " (inactive)" : ""}
        </AppText>
        {lead.assignedTo && lead.assignedAt && (
          <AppText variant="small" muted>
            Since {formatDateTime(lead.assignedAt)}
          </AppText>
        )}
      </View>

      {canWrite && manager && (
        <Button
          title={lead.assignedTo ? "Reassign" : "Assign"}
          variant="secondary"
          icon="person-add-outline"
          onPress={() => setPicking(true)}
        />
      )}

      {canWrite && !manager && mine && pending && (
        <Banner tone="info" title="Handover requested" message={`You asked: "${pending.reason}". Your admin hasn't answered yet.`}>
          <Button title="Cancel request" variant="ghost" loading={cancel.isPending} onPress={confirmCancel} style={styles.bannerButton} />
        </Banner>
      )}
      {canWrite && !manager && mine && !pending && !pendingQuery.isPending && (
        <Button title="Hand over" variant="secondary" icon="swap-horizontal-outline" onPress={() => setAsking(true)} />
      )}

      {manager && (
        <UserPickerSheet
          open={picking}
          onClose={() => setPicking(false)}
          title={lead.assignedTo ? "Reassign lead" : "Assign lead"}
          subtitle={`${lead.businessName}. They get an alert.`}
          value={lead.assignedTo?.id ?? UNASSIGNED}
          onSelect={pick}
          busy={assign.isPending}
        />
      )}
      {!manager && <HandoverSheet lead={lead} open={asking} onClose={() => setAsking(false)} />}
    </Card>
  );
}

function HandoverSheet(props: { lead: Lead; open: boolean; onClose: () => void }) {
  return <HandoverSheetBody key={useOpenKey(props.open)} {...props} />;
}

/** Agents: ask an admin to give this lead to someone else. */
function HandoverSheetBody({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const request = useRequestReassignment();
  const [reason, setReason] = useState("");

  function send() {
    request.mutate(
      { leadId: lead.id, reason: reason.trim() },
      {
        onSuccess: () => {
          onClose();
          Alert.alert("Request sent", "Your admin will decide who takes over. The lead stays yours until then.");
        },
        onError: (error) => Alert.alert("Couldn't send the request", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ask to hand over"
      subtitle={`Your admin decides who takes over ${lead.businessName}. It stays yours until they approve.`}
      footer={
        <Button title="Send request" icon="send" loading={request.isPending} disabled={reason.trim().length < 3} onPress={send} />
      }
    >
      <TextField
        label="Why?"
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. They want someone who speaks Pashto, or they're in another city"
        multiline
        maxLength={1000}
        hint="Mention a teammate if you know who'd be a better fit."
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bannerButton: { alignSelf: "flex-start", minHeight: 36, paddingHorizontal: 0 },
});
