import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { formatMoney } from "@/features/billing/hooks";
import { PLAN_KEYS, planLabels, type PlanKey } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

import { endOfDayIso, useBillingSettings, useCreateInvoice, type PlatformOrganizationDetail } from "../hooks";
import { OptionalDateField } from "./optional-date-field";

interface InvoiceSheetProps {
  organization: PlatformOrganizationDetail;
  open: boolean;
  onClose: () => void;
}

export function InvoiceSheet(props: InvoiceSheetProps) {
  return <InvoiceSheetBody key={useOpenKey(props.open)} {...props} />;
}

/** A manual invoice: a longer period, a special price or an upgrade. Emailed to the owner and admins. */
function InvoiceSheetBody({ organization, open, onClose }: InvoiceSheetProps) {
  const create = useCreateInvoice();
  const settings = useBillingSettings().data;
  const [plan, setPlan] = useState<PlanKey>(organization.plan);
  const [months, setMonths] = useState("1");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState<Date | null>(null);
  const [note, setNote] = useState("");
  const defaultAmount = settings ? settings.prices[plan] * (Number(months) || 1) : undefined;

  function submit() {
    const m = Number(months);
    if (!Number.isInteger(m) || m < 1 || m > 24) return Alert.alert("Check the months", "Months must be between 1 and 24.");
    if (amount && (!Number.isInteger(Number(amount)) || Number(amount) < 0)) {
      return Alert.alert("Check the amount", "The amount must be whole rupees.");
    }
    create.mutate(
      {
        organizationId: organization.id,
        plan,
        months: m,
        ...(amount && { amount: Number(amount) }),
        ...(due && { dueDate: endOfDayIso(due) }),
        ...(note.trim() && { note: note.trim() }),
      },
      {
        onSuccess: (invoice) => {
          onClose();
          Alert.alert(`Invoice ${invoice.number} created`, "It was emailed to the owner and admins.");
        },
        onError: (error) => Alert.alert("Couldn't create the invoice", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`New invoice for ${organization.name}`}
      subtitle="For a longer period, a special price or an upgrade. It's emailed to the owner and admins; paying it moves them to this plan."
      footer={<Button title="Create invoice" icon="document-text-outline" loading={create.isPending} onPress={submit} />}
    >
      <View style={styles.group}>
        <AppText variant="label">Plan</AppText>
        <View style={styles.chips}>
          {PLAN_KEYS.map((p) => (
            <Chip key={p} label={planLabels[p]} selected={plan === p} onPress={() => setPlan(p)} />
          ))}
        </View>
      </View>
      <TextField label="Months" value={months} onChangeText={setMonths} keyboardType="number-pad" maxLength={2} />
      <TextField
        label={`Amount (${settings?.currency ?? "PKR"})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder={defaultAmount !== undefined ? String(defaultAmount) : undefined}
        hint={
          defaultAmount !== undefined
            ? `Empty = ${formatMoney(defaultAmount, settings?.currency)} (price × months)`
            : "Empty = price × months"
        }
      />
      <OptionalDateField label="Due" value={due} onChange={setDue} hint="Empty = today." />
      <TextField label="Note for the customer (optional)" value={note} onChangeText={setNote} multiline maxLength={500} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
