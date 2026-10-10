import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import {
  formatMoney,
  invoiceKindLabels,
  invoiceStatusLabels,
  isOverdue,
  paymentMethodLabels,
  paymentStatusLabels,
  useBillingOverview,
  type Invoice,
} from "@/features/billing/hooks";
import { PLAN_KEYS, planLabels } from "@/features/plans/types";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  const pending = invoice.payments?.some((p) => p.status === "pending");
  if (invoice.status === "open" && pending) return <Badge label="Payment under review" color="sky" />;
  if (isOverdue(invoice)) return <Badge label="Overdue" color="rose" />;
  if (invoice.status === "paid") return <Badge label="Paid" color="emerald" />;
  return <Badge label={invoiceStatusLabels[invoice.status]} />;
}

/**
 * Owners and admins: plan prices and invoices. Choosing a plan and paying
 * happen on the website (app-store payment rules); everything is shown here.
 */
export default function BillingScreen() {
  const { colors } = useTheme();
  const billing = useBillingOverview();
  if (billing.isPending) return <LoadingView />;
  if (!billing.data) return <ErrorView error={billing.error} onRetry={() => void billing.refetch()} />;
  const data = billing.data;
  const status =
    data.billingStatus === "trial"
      ? data.trialEndsAt
        ? `Free trial until ${formatDate(data.trialEndsAt)}`
        : "Free trial"
      : data.paidUntil
        ? `Paid until ${formatDate(data.paidUntil)}`
        : "Paid";

  return (
    <Screen onRefresh={() => billing.refetch()}>
      <Card>
        <AppText variant="heading">{planLabels[data.plan]} plan</AppText>
        <AppText muted>{status}.</AppText>
      </Card>
      <Banner
        tone="info"
        title="Payments are made on the website"
        message="Open GetCloseWise on a computer to choose a plan, pay an invoice by JazzCash, Easypaisa or bank transfer, and upload the receipt. Everything shows here once it's done."
      />

      <AppText variant="heading">Prices</AppText>
      <View style={styles.prices}>
        {PLAN_KEYS.map((plan) => (
          <View
            key={plan}
            style={[styles.price, { backgroundColor: colors.card, borderColor: plan === data.plan ? colors.primary : colors.border }]}
          >
            <AppText weight="600">{planLabels[plan]}</AppText>
            <AppText variant="heading">{formatMoney(data.prices[plan], data.currency)}</AppText>
            <AppText variant="small" muted>
              per month
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="heading">Invoices</AppText>
      {data.invoices.length === 0 ? (
        <Card>
          <AppText muted>No invoices yet.</AppText>
        </Card>
      ) : (
        data.invoices.map((invoice) => (
          <Card key={invoice.id}>
            <View style={styles.row}>
              <AppText weight="600" style={styles.flex}>
                {invoice.number}
              </AppText>
              <AppText weight="700">{formatMoney(invoice.amount, invoice.currency)}</AppText>
            </View>
            <InvoiceStatus invoice={invoice} />
            <AppText variant="small" muted>
              {planLabels[invoice.plan]} · {invoice.months} {invoice.months === 1 ? "month" : "months"} ·{" "}
              {invoiceKindLabels[invoice.kind]} ·{" "}
              {invoice.status === "paid" && invoice.paidAt
                ? `paid ${formatDate(invoice.paidAt)}, covers until ${formatDate(invoice.periodEnd)}`
                : `due ${formatDate(invoice.dueDate)}`}
            </AppText>
            {invoice.note ? <AppText variant="small" muted>{invoice.note}</AppText> : null}
            {invoice.payments?.map((payment) => (
              <View key={payment.id} style={[styles.payment, { borderLeftColor: colors.border }]}>
                <AppText variant="small" muted>
                  {paymentMethodLabels[payment.method]} {formatMoney(payment.amount, invoice.currency)} on {formatDate(payment.paidOn)} (ref{" "}
                  {payment.reference}):{" "}
                  <AppText
                    variant="small"
                    weight="600"
                    color={payment.status === "approved" ? colors.success : payment.status === "rejected" ? colors.danger : undefined}
                  >
                    {paymentStatusLabels[payment.status]}
                  </AppText>
                  {payment.rejectionReason ? ` · ${payment.rejectionReason}` : ""}
                </AppText>
              </View>
            ))}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  prices: { flexDirection: "row", gap: spacing.sm },
  price: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  payment: { borderLeftWidth: 2, paddingLeft: spacing.sm },
});
