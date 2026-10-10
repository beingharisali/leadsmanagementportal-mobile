import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { usePlanSettings, useUpdatePlanSettings } from "@/features/platform/hooks";
import { PLAN_FEATURES, PLAN_KEYS, planFeatureLabels, type PlanDefinition, type PlanFeature, type PlanKey } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const GB = 1024 ** 3;

/** One plan as typed in the form (numbers stay text until saved). */
interface PlanForm {
  description: string;
  users: string;
  leads: string;
  storageGb: string;
  features: PlanFeature[];
}

function toForm(plans: PlanDefinition[]) {
  return Object.fromEntries(
    plans.map((plan) => [
      plan.key,
      {
        description: plan.description,
        users: String(plan.limits.users),
        leads: String(plan.limits.leads),
        storageGb: String(+(plan.limits.storageBytes / GB).toFixed(2)),
        features: [...plan.features],
      },
    ]),
  ) as Record<PlanKey, PlanForm>;
}

/** Heapware staff: the limits and features of each plan. Companies on a plan get changes within a minute. */
export default function PlansScreen() {
  const settings = usePlanSettings();
  if (settings.isPending) return <LoadingView />;
  if (!settings.data) return <ErrorView error={settings.error} onRetry={() => void settings.refetch()} />;
  const { plans, defaults, updatedAt } = settings.data;
  return <PlansForm key={updatedAt ?? "defaults"} plans={plans} defaults={defaults} updatedAt={updatedAt} />;
}

function PlansForm({ plans, defaults, updatedAt }: { plans: PlanDefinition[]; defaults: PlanDefinition[]; updatedAt: string | null }) {
  const { colors } = useTheme();
  const update = useUpdatePlanSettings();
  const [form, setForm] = useState(() => toForm(plans));
  const names = Object.fromEntries(plans.map((p) => [p.key, p.name])) as Record<PlanKey, string>;

  function set(key: PlanKey, change: Partial<PlanForm>) {
    setForm((f) => ({ ...f, [key]: { ...f[key], ...change } }));
  }

  function toggle(key: PlanKey, feature: PlanFeature, on: boolean) {
    const features = on ? [...form[key].features, feature] : form[key].features.filter((f) => f !== feature);
    set(key, { features: PLAN_FEATURES.filter((f) => features.includes(f)) });
  }

  /** The request body, or an error message for the first invalid value. */
  function parse(): Record<PlanKey, Omit<PlanDefinition, "key" | "name">> | string {
    const result = {} as Record<PlanKey, Omit<PlanDefinition, "key" | "name">>;
    for (const key of PLAN_KEYS) {
      const plan = form[key];
      const users = Number(plan.users);
      const leads = Number(plan.leads);
      const storageGb = Number(plan.storageGb);
      if (!plan.description.trim()) return `Add a description for ${names[key]}`;
      if (!Number.isInteger(users) || users < 1) return `${names[key]}: users must be a whole number, at least 1`;
      if (!Number.isInteger(leads) || leads < 1) return `${names[key]}: leads must be a whole number, at least 1`;
      if (!Number.isFinite(storageGb) || storageGb < 0) return `${names[key]}: storage must be 0 GB or more`;
      result[key] = {
        description: plan.description.trim(),
        limits: { users, leads, storageBytes: Math.round(storageGb * GB) },
        features: plan.features,
      };
    }
    return result;
  }

  function review() {
    const parsed = parse();
    if (typeof parsed === "string") return Alert.alert("Check the plans", parsed);
    Alert.alert(
      "Save plans?",
      "Every company on these plans gets the new limits and features right away. Features you turn off are locked for them; their data stays.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save plans",
          onPress: () =>
            update.mutate(parsed, {
              onSuccess: () => Alert.alert("Plans saved"),
              onError: (error) => Alert.alert("Couldn't save the plans", getErrorMessage(error)),
            }),
        },
      ],
    );
  }

  return (
    <Screen>
      <AppText muted>
        Lowering a limit never deletes anything: companies above it keep their users, leads and files but can't add more. New
        companies try the {names.business} plan during their free trial. Prices are under Billing settings.
        {updatedAt ? ` Last changed ${formatDate(updatedAt)}.` : " These are the default plans."}
      </AppText>

      {PLAN_KEYS.map((key) => {
        const plan = form[key];
        return (
          <Card key={key}>
            <AppText variant="heading">{names[key]}</AppText>
            <TextField
              label="Description"
              value={plan.description}
              onChangeText={(v) => set(key, { description: v })}
              maxLength={200}
              hint="Shown to customers when they compare plans."
            />
            <TextField
              label="Users"
              value={plan.users}
              onChangeText={(v) => set(key, { users: v })}
              keyboardType="number-pad"
              hint="Active users plus open invitations."
            />
            <TextField
              label="Leads"
              value={plan.leads}
              onChangeText={(v) => set(key, { leads: v })}
              keyboardType="number-pad"
              hint="Leads in the recycle bin don't count."
            />
            <TextField
              label="File storage (GB)"
              value={plan.storageGb}
              onChangeText={(v) => set(key, { storageGb: v })}
              keyboardType="decimal-pad"
            />
            <AppText variant="label">Features</AppText>
            {PLAN_FEATURES.map((feature) => (
              <View key={feature} style={styles.switchRow}>
                <AppText style={styles.flex}>{planFeatureLabels[feature]}</AppText>
                <Switch
                  value={plan.features.includes(feature)}
                  onValueChange={(on) => toggle(key, feature, on)}
                  trackColor={{ true: colors.primary }}
                  accessibilityLabel={`${names[key]}: ${planFeatureLabels[feature]}`}
                />
              </View>
            ))}
            <AppText variant="small" muted>
              Leads, pipeline, follow-ups, calls, comments, files and sending templates are in every plan.
            </AppText>
          </Card>
        );
      })}

      <Button title="Save plans" icon="checkmark" loading={update.isPending} onPress={review} />
      <Button title="Fill in the defaults" variant="secondary" onPress={() => setForm(toForm(defaults))} />
      <Button title="Undo changes" variant="ghost" onPress={() => setForm(toForm(plans))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
