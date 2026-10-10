import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import type { BillingStatus } from "@/features/organizations/types";
import { OptionalDateField } from "@/features/platform/components/optional-date-field";
import { BILLING_STATUSES, billingStatusLabels, endOfDayIso, useCreateOrganization } from "@/features/platform/hooks";
import { PLAN_KEYS, planLabels, type PlanKey } from "@/features/plans/types";
import { passwordProblem } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

/** API error paths → form fields ("email" is the taken-email conflict). */
const SERVER_FIELDS: Record<string, string> = {
  "body.name": "name",
  "body.admin.name": "ownerName",
  "body.admin.email": "ownerEmail",
  "body.admin.password": "ownerPassword",
  email: "ownerEmail",
};

/** Heapware staff: a new workspace and its owner account. The owner then adds their own team. */
export default function NewCompanyScreen() {
  const create = useCreateOrganization();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<PlanKey>("business");
  const [billing, setBilling] = useState<BillingStatus>("trial");
  const [trialEnds, setTrialEnds] = useState<Date | null>(null);
  const [paidUntil, setPaidUntil] = useState<Date | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Company name is required";
    if (ownerName.trim().length < 2) found.ownerName = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) found.ownerEmail = "Enter a valid email";
    const problem = passwordProblem(ownerPassword);
    if (problem) found.ownerPassword = problem;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    create.mutate(
      {
        name: name.trim(),
        plan,
        billingStatus: billing,
        ...(billing === "trial" && trialEnds && { trialEndsAt: endOfDayIso(trialEnds) }),
        ...(billing === "paid" && paidUntil && { paidUntil: endOfDayIso(paidUntil) }),
        admin: {
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          ...(ownerPhone.trim() && { phone: ownerPhone.trim() }),
          password: ownerPassword,
        },
      },
      {
        onSuccess: (organization) => {
          router.back();
          Alert.alert(`${organization.name} is ready`, "Share the owner's email and password with them securely.");
        },
        onError: (error) => {
          const fromServer: Record<string, string> = {};
          if (error instanceof ApiClientError) {
            for (const detail of error.errors ?? []) {
              const field = SERVER_FIELDS[detail.path];
              if (field) fromServer[field] = detail.message;
            }
          }
          setErrors(fromServer);
          Alert.alert("Couldn't create the company", getErrorMessage(error));
        },
      },
    );
  }

  return (
    <Screen>
      <AppText muted>Creates a workspace and its owner account. The owner can then add their own team.</AppText>
      <Card>
        <TextField label="Company name" value={name} onChangeText={setName} error={errors.name} maxLength={120} />
        <View style={styles.group}>
          <AppText variant="label">Plan</AppText>
          <View style={styles.chips}>
            {PLAN_KEYS.map((p) => (
              <Chip key={p} label={planLabels[p]} selected={plan === p} onPress={() => setPlan(p)} />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="label">Billing</AppText>
          <View style={styles.chips}>
            {BILLING_STATUSES.map((b) => (
              <Chip key={b} label={billingStatusLabels[b]} selected={billing === b} onPress={() => setBilling(b)} />
            ))}
          </View>
        </View>
        {billing === "trial" ? (
          <OptionalDateField label="Trial ends" value={trialEnds} onChange={setTrialEnds} hint="Leave empty for the default trial length." />
        ) : (
          <OptionalDateField
            label="Paid until"
            value={paidUntil}
            onChange={setPaidUntil}
            hint="After this date the workspace becomes read-only. Leave empty for no end date."
          />
        )}
      </Card>

      <Card>
        <AppText variant="heading">Owner</AppText>
        <TextField label="Name" value={ownerName} onChangeText={setOwnerName} error={errors.ownerName} autoCapitalize="words" maxLength={100} />
        <TextField
          label="Email"
          value={ownerEmail}
          onChangeText={setOwnerEmail}
          error={errors.ownerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Phone"
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          keyboardType="phone-pad"
          placeholder="0300 1234567"
          maxLength={30}
        />
        <TextField
          label="Temporary password"
          value={ownerPassword}
          onChangeText={setOwnerPassword}
          error={errors.ownerPassword}
          password
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number."
        />
      </Card>

      <Button title="Create company" icon="checkmark" loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
