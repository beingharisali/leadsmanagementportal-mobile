import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { EmptyView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { formatMoney, paymentMethodLabels, paymentStatusLabels } from "@/features/billing/hooks";
import {
  openPaymentProof,
  useApprovePayment,
  usePlatformPayments,
  useRejectPayment,
  type PaymentStatus,
  type PlatformPayment,
} from "@/features/platform/hooks";
import { planLabels } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDate, formatDateTime } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const TABS: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: "To review" },
  { value: "approved", label: paymentStatusLabels.approved },
  { value: "rejected", label: paymentStatusLabels.rejected },
];

const invoiceOf = (payment: PlatformPayment) => (typeof payment.invoice === "string" ? null : payment.invoice);

/** Heapware staff: receipts customers uploaded. Approving pays the invoice and switches the company's plan. */
export default function PaymentsScreen() {
  // Opened from the search screen: that payment, on its own status's tab.
  const link = useLocalSearchParams<{ search?: string; status?: string }>();
  const [search, setSearch] = useState(link.search ?? "");
  const [status, setStatus] = useState<PaymentStatus>(TABS.find((t) => t.value === link.status)?.value ?? "pending");
  const payments = usePlatformPayments(status, search || undefined);
  const approve = useApprovePayment();
  const [rejecting, setRejecting] = useState<PlatformPayment | null>(null);

  const confirmApprove = useCallback(
    (payment: PlatformPayment) =>
      Alert.alert(
        "Approve this payment?",
        `Only approve once you've seen ${formatMoney(payment.amount)} arrive in your ${paymentMethodLabels[payment.method]} account. ${payment.organization?.name ?? "The company"} moves to the invoice's plan and its paid period is extended.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: () =>
              approve.mutate(payment.id, {
                onSuccess: () => Alert.alert(`Payment from ${payment.organization?.name ?? "the company"} approved`),
                onError: (error) => Alert.alert("Couldn't approve it", getErrorMessage(error)),
              }),
          },
        ],
      ),
    [approve],
  );

  const renderItem = useCallback(
    ({ item }: { item: PlatformPayment }) => (
      <PaymentRow
        payment={item}
        approving={approve.isPending && approve.variables === item.id}
        onApprove={() => confirmApprove(item)}
        onReject={() => setRejecting(item)}
      />
    ),
    [approve.isPending, approve.variables, confirmApprove],
  );

  return (
    <>
      <InfiniteList
        items={flattenPages(payments.data)}
        renderItem={renderItem}
        keyExtractor={(payment) => payment.id}
        isPending={payments.isPending}
        error={payments.error}
        onRetry={() => void payments.refetch()}
        onRefresh={() => payments.refetch()}
        hasNextPage={payments.hasNextPage}
        isFetchingNextPage={payments.isFetchingNextPage}
        fetchNextPage={() => void payments.fetchNextPage()}
        header={
          <>
            <SegmentedControl segments={TABS} value={status} onChange={setStatus} />
            {search ? <Chip icon="close" label={`Reference ${search}`} selected onPress={() => setSearch("")} /> : null}
          </>
        }
        empty={
          <EmptyView
            icon="receipt-outline"
            title={status === "pending" ? "Nothing to review" : `No ${paymentStatusLabels[status].toLowerCase()} payments`}
            message={status === "pending" ? "New receipts show up here and are emailed to you." : undefined}
          />
        }
      />
      <RejectSheet payment={rejecting} onClose={() => setRejecting(null)} />
    </>
  );
}

function PaymentRow({
  payment,
  approving,
  onApprove,
  onReject,
}: {
  payment: PlatformPayment;
  approving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { colors } = useTheme();
  const [opening, setOpening] = useState(false);
  const invoice = invoiceOf(payment);
  const mismatch = invoice && invoice.amount !== payment.amount;

  async function openReceipt() {
    setOpening(true);
    try {
      await openPaymentProof(payment);
    } catch (error) {
      Alert.alert("Couldn't open the receipt", getErrorMessage(error));
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <AppText weight="600" numberOfLines={1} style={styles.flex}>
          {payment.organization?.name ?? "—"}
        </AppText>
        <AppText weight="700">{formatMoney(payment.amount)}</AppText>
      </View>
      {mismatch ? <Badge label={`Differs from the invoice (${formatMoney(invoice.amount)})`} color="amber" /> : null}
      <AppText variant="small" muted>
        {paymentMethodLabels[payment.method]} · paid {formatDate(payment.paidOn)} · by {payment.submittedBy?.name ?? "—"},{" "}
        {formatDateTime(payment.createdAt)}
      </AppText>
      {invoice ? (
        <AppText variant="small" muted>
          {invoice.number} · {planLabels[invoice.plan]} · {invoice.months} {invoice.months === 1 ? "month" : "months"}
        </AppText>
      ) : null}
      <AppText variant="small" selectable>
        Ref {payment.reference}
      </AppText>
      {payment.note ? (
        <AppText variant="small" muted>
          {payment.note}
        </AppText>
      ) : null}

      <Button title="Open receipt" variant="ghost" icon="document-text-outline" loading={opening} onPress={() => void openReceipt()} />
      {payment.status === "pending" ? (
        <View style={styles.actions}>
          <Button title="Reject" variant="secondary" icon="close" onPress={onReject} style={styles.flex} />
          <Button title="Approve" icon="checkmark" loading={approving} onPress={onApprove} style={styles.flex} />
        </View>
      ) : (
        <AppText variant="small" muted>
          {paymentStatusLabels[payment.status]} by {payment.reviewedBy?.name ?? "—"}
          {payment.reviewedAt ? ` · ${formatDateTime(payment.reviewedAt)}` : ""}
          {payment.rejectionReason ? (
            <AppText variant="small" color={colors.danger}>
              {"\n"}
              {payment.rejectionReason}
            </AppText>
          ) : null}
        </AppText>
      )}
    </View>
  );
}

function RejectSheet(props: { payment: PlatformPayment | null; onClose: () => void }) {
  return <RejectSheetBody key={useOpenKey(!!props.payment)} {...props} />;
}

/** The invoice stays unpaid and the company is emailed the reason, so they can upload the right receipt. */
function RejectSheetBody({ payment, onClose }: { payment: PlatformPayment | null; onClose: () => void }) {
  const reject = useRejectPayment();
  const [reason, setReason] = useState("");

  function submit() {
    if (!payment) return;
    if (reason.trim().length < 3) return Alert.alert("Add a reason", "Tell the customer what was wrong.");
    reject.mutate(
      { id: payment.id, reason: reason.trim() },
      {
        onSuccess: () => {
          onClose();
          Alert.alert("Payment rejected", "The customer was emailed the reason.");
        },
        onError: (error) => Alert.alert("Couldn't reject it", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={!!payment}
      onClose={onClose}
      title="Reject this payment?"
      subtitle={`The invoice stays unpaid and ${payment?.organization?.name ?? "the company"} is emailed your reason so they can upload the right receipt.`}
      footer={<Button title="Reject payment" variant="danger" loading={reject.isPending} onPress={submit} />}
    >
      <TextField
        label="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={500}
        placeholder="e.g. We couldn't find this transaction ID"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { padding: spacing.md, borderWidth: 1, borderRadius: radius.lg, gap: spacing.xs },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
});
