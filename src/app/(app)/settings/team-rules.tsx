import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { useUpdateTeamSettings, useWorkspaceSettings } from "@/features/customization/hooks";
import { TARGET_METRICS, targetMetricLabels, type TargetSet, type TeamSettings } from "@/features/customization/types";
import { IconButton } from "@/features/settings/components/icon-button";
import { RowInput } from "@/features/settings/components/row-input";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** A whole number ≥ 0 from an input; empty means 0 (no target). */
const toCount = (value: string) => Math.max(0, Math.floor(Number(value.replace(/,/g, "")) || 0));

/** Owners and admins: targets, stale lead alerts, lead expiry and the end-of-day email. */
export default function TeamRulesScreen() {
  const settings = useWorkspaceSettings().data;
  return (
    <Screen>
      <AppText muted>Targets for your agents, what happens to leads nobody is working, and the daily email about your team.</AppText>
      {settings ? <TeamForm key={JSON.stringify(settings.team)} saved={settings.team} /> : <AppText muted>Loading…</AppText>}
    </Screen>
  );
}

/** Per-day and per-month boxes for every metric. */
function TargetGrid({
  daily,
  monthly,
  onChange,
}: {
  daily: TargetSet;
  monthly: TargetSet;
  onChange: (next: { daily: TargetSet; monthly: TargetSet }) => void;
}) {
  return (
    <View style={styles.grid}>
      <View style={styles.gridRow}>
        <AppText variant="small" muted style={styles.metric}>
          Target
        </AppText>
        <AppText variant="small" muted style={styles.cell}>
          Per day
        </AppText>
        <AppText variant="small" muted style={styles.cell}>
          Per month
        </AppText>
      </View>
      {TARGET_METRICS.map((metric) => (
        <View key={metric} style={styles.gridRow}>
          <AppText variant="small" style={styles.metric}>
            {targetMetricLabels[metric]}
          </AppText>
          <RowInput
            accessibilityLabel={`${targetMetricLabels[metric]} per day`}
            keyboardType="number-pad"
            placeholder="—"
            value={daily[metric] ? String(daily[metric]) : ""}
            onChangeText={(v) => onChange({ daily: { ...daily, [metric]: toCount(v) }, monthly })}
            style={styles.cell}
          />
          <RowInput
            accessibilityLabel={`${targetMetricLabels[metric]} per month`}
            keyboardType="number-pad"
            placeholder="—"
            value={monthly[metric] ? String(monthly[metric]) : ""}
            onChangeText={(v) => onChange({ daily, monthly: { ...monthly, [metric]: toCount(v) } })}
            style={styles.cell}
          />
        </View>
      ))}
    </View>
  );
}

function TeamForm({ saved }: { saved: TeamSettings }) {
  const { colors } = useTheme();
  const update = useUpdateTeamSettings();
  const users = useAssignableUsers().data ?? [];
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState(false);
  const set = (patch: Partial<TeamSettings>) => setValues((v) => ({ ...v, ...patch }));
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "Former agent";

  function save() {
    const next: Record<string, string> = {};
    if (values.expireAfterDays > 0 && values.staleAfterDays > 0 && values.expireAfterDays <= values.staleAfterDays) {
      next.expireAfterDays = "Must be longer than the stale period, so agents are reminded first";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    update.mutate(values, {
      onSuccess: () => Alert.alert("Team rules saved"),
      onError: (error) => {
        if (error instanceof ApiClientError && error.errors) {
          setErrors(Object.fromEntries(error.errors.map((e) => [e.path.replace(/^body\./, ""), e.message])));
        }
        Alert.alert("Couldn't save", getErrorMessage(error));
      },
    });
  }

  const switchRow = (label: string, hint: string, value: boolean, onChange: (on: boolean) => void) => (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="small" muted>
          {hint}
        </AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
    </View>
  );

  return (
    <>
      <Card>
        <AppText variant="heading">Targets for every agent</AppText>
        <AppText variant="small" muted>
          Agents see their progress on the dashboard. Leave a box empty for no target. Daily activity targets also set what
          a full productivity score means.
        </AppText>
        <TargetGrid
          daily={values.dailyTargets}
          monthly={values.monthlyTargets}
          onChange={({ daily, monthly }) => set({ dailyTargets: daily, monthlyTargets: monthly })}
        />
      </Card>

      <Card>
        <AppText variant="heading">Agents with their own targets</AppText>
        <AppText variant="small" muted>
          For a new joiner, a part-timer or your top closer.
        </AppText>
        {values.agentTargets.map((own, index) => (
          <View key={own.user} style={[styles.own, { borderColor: colors.border }]}>
            <View style={styles.ownHeader}>
              <AppText weight="600" style={styles.flex}>
                {nameOf(own.user)}
              </AppText>
              <IconButton
                icon="trash-outline"
                danger
                label={`Remove ${nameOf(own.user)}'s own targets`}
                onPress={() => set({ agentTargets: values.agentTargets.filter((_, i) => i !== index) })}
              />
            </View>
            <TargetGrid
              daily={own.daily}
              monthly={own.monthly}
              onChange={(next) => set({ agentTargets: values.agentTargets.map((t, i) => (i === index ? { ...t, ...next } : t)) })}
            />
          </View>
        ))}
        <Button title="Add an agent" variant="secondary" icon="person-add-outline" onPress={() => setPicking(true)} />
      </Card>

      <Card>
        {switchRow(
          "Stale lead alerts",
          "Each morning, remind agents of open leads nobody has called, messaged or followed up for a while, and tell admins how many there are.",
          values.staleAfterDays > 0,
          (on) => set({ staleAfterDays: on ? 7 : 0 }),
        )}
        {values.staleAfterDays > 0 && (
          <TextField
            label="Stale after (days without contact)"
            value={String(values.staleAfterDays)}
            onChangeText={(v) => set({ staleAfterDays: Math.min(365, Math.max(1, toCount(v))) })}
            keyboardType="number-pad"
          />
        )}
        {switchRow(
          "Lead expiry",
          "Open leads with no contact for longer than this go back to the unassigned pool, so someone else can pick them up. Their agent and the admins are told.",
          values.expireAfterDays > 0,
          (on) => set({ expireAfterDays: on ? Math.max(30, values.staleAfterDays + 1) : 0 }),
        )}
        {values.expireAfterDays > 0 && (
          <TextField
            label="Expire after (days without contact)"
            value={String(values.expireAfterDays)}
            onChangeText={(v) => set({ expireAfterDays: Math.min(365, Math.max(1, toCount(v))) })}
            keyboardType="number-pad"
            error={errors.expireAfterDays}
          />
        )}
        {switchRow(
          "End-of-day report",
          "Half an hour after the shift ends on work days, owners and admins get an email with each agent's sign-in time, calls, follow-ups and deals. Needs a plan with team monitoring.",
          values.endOfDayReport,
          (endOfDayReport) => set({ endOfDayReport }),
        )}
      </Card>

      <View style={styles.buttons}>
        <Button title="Undo" variant="ghost" disabled={!dirty} onPress={() => setValues(saved)} />
        <Button title="Save team rules" loading={update.isPending} disabled={!dirty} onPress={save} style={styles.flex} />
      </View>

      <UserPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Own targets for"
        value={null}
        onSelect={(id) => {
          setPicking(false);
          if (!id || values.agentTargets.some((t) => t.user === id)) return;
          set({
            agentTargets: [...values.agentTargets, { user: id, daily: { ...values.dailyTargets }, monthly: { ...values.monthlyTargets } }],
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { gap: spacing.xs + 2 },
  gridRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metric: { flex: 1 },
  cell: { flex: 0, width: 92, textAlign: "center" },
  own: { gap: spacing.sm, borderWidth: 1, borderRadius: 10, padding: spacing.md },
  ownHeader: { flexDirection: "row", alignItems: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
