import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { EmptyView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useCanEdit } from "@/features/organizations/hooks";
import {
  reassignmentStatusLabels,
  useApproveReassignment,
  usePendingReassignmentCount,
  useReassignments,
  useRejectReassignment,
  type ReassignmentRequest,
} from "@/features/reassignments/hooks";
import { UNASSIGNED, UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatTimeAgo } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const STATUS_COLORS = { pending: "amber", approved: "emerald", rejected: "rose", cancelled: "slate" } as const;

/** Managers: agents asking for one of their leads to go to someone else. */
export default function HandoversScreen() {
  const canEdit = useCanEdit();
  const [view, setView] = useState<"pending" | "all">("pending");
  const requests = useReassignments(view === "pending" ? { status: "pending" } : {});
  const pendingCount = usePendingReassignmentCount(true);
  const approve = useApproveReassignment();
  const [approving, setApproving] = useState<ReassignmentRequest | null>(null);
  const [rejecting, setRejecting] = useState<ReassignmentRequest | null>(null);

  function decide(assigneeId: string | null) {
    if (!approving) return;
    approve.mutate(
      { id: approving.id, assigneeId },
      {
        onSuccess: () => setApproving(null),
        onError: (error) => Alert.alert("Couldn't approve it", getErrorMessage(error)),
      },
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: ReassignmentRequest }) => (
      <RequestCard
        request={item}
        onApprove={canEdit ? () => setApproving(item) : undefined}
        onReject={canEdit ? () => setRejecting(item) : undefined}
      />
    ),
    [canEdit],
  );

  return (
    <>
      <InfiniteList
        items={flattenPages(requests.data)}
        renderItem={renderItem}
        keyExtractor={(r) => r.id}
        isPending={requests.isPending}
        error={requests.error}
        onRetry={() => void requests.refetch()}
        onRefresh={() => Promise.all([requests.refetch(), pendingCount.refetch()])}
        hasNextPage={requests.hasNextPage}
        isFetchingNextPage={requests.isFetchingNextPage}
        fetchNextPage={() => void requests.fetchNextPage()}
        header={
          <SegmentedControl
            value={view}
            onChange={setView}
            segments={[
              { value: "pending", label: "Waiting", count: pendingCount.data, urgent: true },
              { value: "all", label: "All requests" },
            ]}
          />
        }
        empty={
          <EmptyView
            icon="swap-horizontal-outline"
            title={view === "pending" ? "Nothing waiting" : "No requests yet"}
            message="When an agent asks to hand a lead over, it shows here."
          />
        }
      />
      <UserPickerSheet
        open={!!approving}
        onClose={() => setApproving(null)}
        title="Give the lead to"
        subtitle={approving ? `${approving.lead?.businessName ?? "Lead"}, from ${approving.requestedBy?.name ?? "the agent"}` : undefined}
        value={approving?.suggestedTo?.id ?? UNASSIGNED}
        onSelect={decide}
        busy={approve.isPending}
      />
      <RejectSheet request={rejecting} onClose={() => setRejecting(null)} />
    </>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: ReassignmentRequest;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const { colors } = useTheme();
  const lead = request.lead;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        disabled={!lead || lead.isDeleted}
        onPress={() => lead && router.push({ pathname: "/leads/[id]", params: { id: lead.id } })}
        accessibilityRole="button"
      >
        <AppText weight="600">{lead ? lead.businessName : "Deleted lead"}</AppText>
        <AppText variant="small" muted>
          {request.requestedBy?.name ?? "Someone"} · {formatTimeAgo(request.createdAt)}
          {request.suggestedTo ? ` · suggests ${request.suggestedTo.name}` : ""}
        </AppText>
      </Pressable>
      <Badge label={reassignmentStatusLabels[request.status]} color={STATUS_COLORS[request.status]} />
      <AppText>{request.reason}</AppText>
      {request.status === "approved" && (
        <AppText variant="small" muted>
          Given to {request.assignedTo?.name ?? "the unassigned pool"}
          {request.decidedBy ? ` by ${request.decidedBy.name}` : ""}
        </AppText>
      )}
      {request.status === "rejected" && (
        <AppText variant="small" muted>
          Turned down{request.decidedBy ? ` by ${request.decidedBy.name}` : ""}
          {request.decisionNote ? `: ${request.decisionNote}` : ""}
        </AppText>
      )}
      {request.status === "pending" && onApprove && onReject && lead && !lead.isDeleted && (
        <View style={styles.buttons}>
          <Button title="Turn down" variant="secondary" onPress={onReject} style={styles.flex} />
          <Button title="Approve" icon="checkmark" onPress={onApprove} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

function RejectSheet(props: { request: ReassignmentRequest | null; onClose: () => void }) {
  return <RejectSheetBody key={useOpenKey(!!props.request)} {...props} />;
}

function RejectSheetBody({ request, onClose }: { request: ReassignmentRequest | null; onClose: () => void }) {
  const reject = useRejectReassignment();
  const [note, setNote] = useState("");

  function send() {
    if (!request) return;
    reject.mutate(
      { id: request.id, note: note.trim() || undefined },
      { onSuccess: onClose, onError: (error) => Alert.alert("Couldn't turn it down", getErrorMessage(error)) },
    );
  }

  return (
    <Sheet
      open={!!request}
      onClose={onClose}
      title="Turn down the request"
      subtitle={request ? `${request.requestedBy?.name ?? "The agent"} keeps ${request.lead?.businessName ?? "the lead"}.` : undefined}
      footer={<Button title="Turn down" variant="danger" loading={reject.isPending} onPress={send} />}
    >
      <TextField
        label="Note for the agent"
        value={note}
        onChangeText={setNote}
        placeholder="Optional: why, or what to try instead"
        multiline
        maxLength={1000}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
