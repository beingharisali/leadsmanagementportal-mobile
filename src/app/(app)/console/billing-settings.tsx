import { useState } from "react";
import { Alert } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useBillingSettings, useUpdateBillingSettings, type BillingSettings } from "@/features/platform/hooks";
import { PLAN_KEYS, planLabels, type PlanKey } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";

/** Heapware staff: plan prices, when invoices and reminders go out, and the accounts customers pay into. */
export default function BillingSettingsScreen() {
  const settings = useBillingSettings();
  if (settings.isPending) return <LoadingView />;
  if (!settings.data) return <ErrorView error={settings.error} onRetry={() => void settings.refetch()} />;
  return <SettingsForm key={JSON.stringify(settings.data)} settings={settings.data} />;
}

type Details = BillingSettings["paymentDetails"];

function SettingsForm({ settings }: { settings: BillingSettings }) {
  const update = useUpdateBillingSettings();
  const [prices, setPrices] = useState(
    () => Object.fromEntries(PLAN_KEYS.map((p) => [p, String(settings.prices[p])])) as Record<PlanKey, string>,
  );
  const [daysBefore, setDaysBefore] = useState(String(settings.invoiceDaysBefore));
  const [reminders, setReminders] = useState(settings.reminderDays.join(", "));
  const [details, setDetails] = useState(settings.paymentDetails);

  function setAccount<K extends keyof Details>(method: K, field: keyof Details[K], value: string) {
    setDetails((d) => ({ ...d, [method]: { ...d[method], [field]: value } }));
  }

  function save() {
    const parsedPrices = Object.fromEntries(PLAN_KEYS.map((p) => [p, Number(prices[p])])) as Record<PlanKey, number>;
    if (Object.values(parsedPrices).some((n) => !Number.isInteger(n) || n < 0)) {
      return Alert.alert("Check the prices", "Prices must be whole rupees.");
    }
    const days = Number(daysBefore);
    if (!Number.isInteger(days) || days < 0) return Alert.alert("Check the invoice timing", "Days before renewal must be a whole number.");
    const reminderDays = reminders
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    if (reminderDays.some((n) => !Number.isInteger(n))) {
      return Alert.alert("Check the reminders", "Reminder days must be whole numbers, e.g. 3, 1, 0, -3");
    }
    update.mutate(
      { prices: parsedPrices, invoiceDaysBefore: days, reminderDays, paymentDetails: details },
      {
        onSuccess: () => Alert.alert("Billing settings saved"),
        onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
      },
    );
  }

  return (
    <Screen>
      <Card>
        <AppText variant="heading">Prices</AppText>
        <AppText variant="small" muted>
          Monthly price of each plan in {settings.currency}. New invoices use these; existing ones keep their amount.
        </AppText>
        {PLAN_KEYS.map((plan) => (
          <TextField
            key={plan}
            label={planLabels[plan]}
            value={prices[plan]}
            onChangeText={(v) => setPrices((p) => ({ ...p, [plan]: v }))}
            keyboardType="number-pad"
          />
        ))}
      </Card>

      <Card>
        <AppText variant="heading">Invoices and reminders</AppText>
        <TextField
          label="Create invoices (days before renewal)"
          value={daysBefore}
          onChangeText={setDaysBefore}
          keyboardType="number-pad"
          hint="Before a trial or paid month ends. The invoice is emailed to owners and admins."
        />
        <TextField
          label="Reminder emails (days from due date)"
          value={reminders}
          onChangeText={setReminders}
          keyboardType="numbers-and-punctuation"
          hint="3 = three days before, 0 = on the day, -3 = three days late."
        />
      </Card>

      <Card>
        <AppText variant="heading">Where customers pay</AppText>
        <AppText variant="small" muted>
          Shown when they pay an invoice. Leave a method empty to show "contact Heapware" instead.
        </AppText>
        <TextField
          label="JazzCash account title"
          value={details.jazzcash.accountTitle}
          onChangeText={(v) => setAccount("jazzcash", "accountTitle", v)}
        />
        <TextField
          label="JazzCash number"
          value={details.jazzcash.accountNumber}
          onChangeText={(v) => setAccount("jazzcash", "accountNumber", v)}
          keyboardType="phone-pad"
          placeholder="03xx xxxxxxx"
        />
        <TextField
          label="Easypaisa account title"
          value={details.easypaisa.accountTitle}
          onChangeText={(v) => setAccount("easypaisa", "accountTitle", v)}
        />
        <TextField
          label="Easypaisa number"
          value={details.easypaisa.accountNumber}
          onChangeText={(v) => setAccount("easypaisa", "accountNumber", v)}
          keyboardType="phone-pad"
          placeholder="03xx xxxxxxx"
        />
        <TextField label="Bank" value={details.bank.bankName} onChangeText={(v) => setAccount("bank", "bankName", v)} />
        <TextField label="Account title" value={details.bank.accountTitle} onChangeText={(v) => setAccount("bank", "accountTitle", v)} />
        <TextField
          label="Account number"
          value={details.bank.accountNumber}
          onChangeText={(v) => setAccount("bank", "accountNumber", v)}
        />
        <TextField
          label="IBAN"
          value={details.bank.iban}
          onChangeText={(v) => setAccount("bank", "iban", v)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </Card>

      <Button title="Save settings" icon="checkmark" loading={update.isPending} onPress={save} />
    </Screen>
  );
}
