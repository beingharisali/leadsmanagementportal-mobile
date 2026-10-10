import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { formatMoney, invoiceKindLabels, invoiceStatusLabels, isOverdue } from "@/features/billing/hooks";
import { usePlatformInvoices, useVoidInvoice, type InvoiceFilter, type PlatformInvoice } from "@/features/platform/hooks";
import { planLabels } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const FILTERS = {
  open: { label: "Unpaid", params: { status: "open" } },
  overdue: { label: "Overdue", params: { overdue: true } },
  paid: { label: "Paid", params: { status: "paid" } },
  void: { label: "Cancelled", params: { status: "void" } },
  all: { label: "All invoices", params: {} },
} satisfies Record<string, { label: string; params: InvoiceFilter }>;
type Filter = keyof typeof FILTERS;

function StatusBadge({ invoice }: { invoice: PlatformInvoice }) {
  if (isOverdue(invoice)) return <Badge label="Overdue" color="rose" />;
  if (invoice.status === "paid") return <Badge label="Paid" color="emerald" />;
  return <Badge label={invoiceStatusLabels[invoice.status]} />;
}

/** Heapware staff: every company's invoices; cancel ones that shouldn't be paid. */
export default function InvoicesScreen() {
  const [filter, setFilter] = useState<Filter>("open");
  const invoices = usePlatformInvoices(FILTERS[filter].params);
  const voidInvoice = useVoidInvoice();

  const confirmVoid = useCallback(
    (invoice: PlatformInvoice) =>
      Alert.alert(
        `Cancel invoice ${invoice.number}?`,
        "The customer no longer sees it and gets no more reminders for it. If their period still ends, a new renewal invoice is created.",
        [
          { text: "Keep it", style: "cancel" },
          {
            text: "Cancel invoice",
            style: "destructive",
            onPress: () =>
              voidInvoice.mutate(invoice.id, {
                onSuccess: () => Alert.alert(`Invoice ${invoice.number} cancelled`),
                onError: (error) => Alert.alert("Couldn't cancel it", getErrorMessage(error)),
              }),
          },
        ],
      ),
    [voidInvoice],
  );

  const renderItem = useCallback(
    ({ item }: { item: PlatformInvoice }) => (
      <InvoiceRow
        invoice={item}
        voiding={voidInvoice.isPending && voidInvoice.variables === item.id}
        onVoid={() => confirmVoid(item)}
      />
    ),
    [confirmVoid, voidInvoice.isPending, voidInvoice.variables],
  );

  return (
    <InfiniteList
      items={flattenPages(invoices.data)}
      renderItem={renderItem}
      keyExtractor={(invoice) => invoice.id}
      isPending={invoices.isPending}
      error={invoices.error}
      onRetry={() => void invoices.refetch()}
      onRefresh={() => invoices.refetch()}
      hasNextPage={invoices.hasNextPage}
      isFetchingNextPage={invoices.isFetchingNextPage}
      fetchNextPage={() => void invoices.fetchNextPage()}
      header={
        <>
          <AppText muted>
            Created automatically before each trial or paid month ends, when a customer picks a plan, or by you from a company's page.
          </AppText>
          <View style={styles.chips}>
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <Chip key={key} label={FILTERS[key].label} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
          </View>
        </>
      }
      empty={<EmptyView icon="document-text-outline" title="No invoices here" />}
    />
  );
}

function InvoiceRow({ invoice, voiding, onVoid }: { invoice: PlatformInvoice; voiding: boolean; onVoid: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <AppText weight="600" numberOfLines={1} style={styles.flex}>
          {invoice.organization?.name ?? "—"}
        </AppText>
        <AppText weight="700">{formatMoney(invoice.amount, invoice.currency)}</AppText>
      </View>
      <View style={styles.top}>
        <StatusBadge invoice={invoice} />
        <AppText variant="small" muted numberOfLines={1} style={styles.flex}>
          {invoice.number} · {invoiceKindLabels[invoice.kind]}
        </AppText>
      </View>
      <AppText variant="small" muted>
        {planLabels[invoice.plan]} · {invoice.months} {invoice.months === 1 ? "month" : "months"} ·{" "}
        {invoice.status === "paid" && invoice.paidAt ? `paid ${formatDate(invoice.paidAt)}` : `due ${formatDate(invoice.dueDate)}`}
      </AppText>
      {invoice.note ? (
        <AppText variant="small" muted>
          {invoice.note}
        </AppText>
      ) : null}
      {invoice.status === "open" && <Button title="Cancel invoice" variant="ghost" loading={voiding} onPress={onVoid} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { padding: spacing.md, borderWidth: 1, borderRadius: radius.lg, gap: spacing.xs },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
