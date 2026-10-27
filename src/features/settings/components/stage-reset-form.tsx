import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useUpdateStageResets, useWorkspaceSettings } from "@/features/customization/hooks";
import { CLOSED_STAGES, LOST_STAGE, type StageReset, type WorkspaceSettings } from "@/features/customization/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { IconButton } from "./icon-button";

const MAX_RULES = 10;

type RuleDraft = Partial<StageReset> & { id: number };

let nextId = 0;
const toDrafts = (rules: StageReset[]): RuleDraft[] => rules.map((r) => ({ ...r, id: nextId++ }));

/**
 * Daily rules: leads left in one open stage move to another open stage or to
 * Lost at midnight the next day, keeping their agent. Only saved stages can be
 * picked.
 */
export function StageResetForm() {
  const settings = useWorkspaceSettings().data;
  if (!settings) return <AppText muted>Loading…</AppText>;
  return <RulesForm key={JSON.stringify([settings.stageResets, settings.pipelineStages])} settings={settings} />;
}

function RulesForm({ settings }: { settings: WorkspaceSettings }) {
  const { colors } = useTheme();
  const update = useUpdateStageResets();
  const open = settings.pipelineStages.filter((s) => !CLOSED_STAGES.includes(s.key));
  const lost = settings.pipelineStages.find((s) => s.key === LOST_STAGE);
  const targets = lost ? [...open, lost] : open;
  const [rules, setRules] = useState(() => toDrafts(settings.stageResets));

  const plain = rules.map(({ from, to }) => ({ from, to }));
  const dirty = JSON.stringify(plain) !== JSON.stringify(settings.stageResets);
  const set = (id: number, change: Partial<StageReset>) =>
    setRules((all) => all.map((r) => (r.id === id ? { ...r, ...change } : r)));

  function save() {
    if (rules.some((r) => !r.from || !r.to)) return Alert.alert("Pick both stages in every rule");
    if (rules.some((r) => r.from === r.to)) return Alert.alert("A rule needs two different stages");
    if (new Set(rules.map((r) => r.from)).size !== rules.length) return Alert.alert("A stage can only have one rule");
    update.mutate(plain as StageReset[], {
      onSuccess: () => Alert.alert("Daily rules saved"),
      onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
    });
  }

  return (
    <View style={styles.form}>
      <AppText variant="small" muted>
        A lead stays in the stage for the rest of the day it was moved there. At midnight (your company&apos;s time zone)
        it moves on, stays with the same agent, and its history shows the move. For a rule into {lost?.label ?? "Lost"},
        agents give a reason when they move the lead, and it&apos;s kept.
      </AppText>

      {rules.length === 0 && <AppText muted>No daily rules.</AppText>}
      {rules.map((rule, index) => (
        <View key={rule.id} style={[styles.rule, { borderColor: colors.border }]}>
          <View style={styles.ruleHeader}>
            <AppText variant="label" style={styles.flex}>
              Rule {index + 1}
            </AppText>
            <IconButton
              icon="trash-outline"
              label="Remove rule"
              danger
              onPress={() => setRules((all) => all.filter((r) => r.id !== rule.id))}
            />
          </View>
          <SelectField
            label="Leads in"
            placeholder="Pick a stage"
            value={rule.from ?? ""}
            options={open
              .filter((s) => s.key === rule.from || !rules.some((r) => r.from === s.key))
              .map((s) => ({ value: s.key, label: s.label }))}
            onChange={(from) => set(rule.id, { from, ...(rule.to === from && { to: undefined }) })}
          />
          <SelectField
            label="Move to"
            placeholder="Pick a stage"
            value={rule.to ?? ""}
            options={targets.filter((s) => s.key !== rule.from).map((s) => ({ value: s.key, label: s.label }))}
            onChange={(to) => set(rule.id, { to })}
          />
        </View>
      ))}

      <Button
        title="Add rule"
        variant="secondary"
        icon="add"
        disabled={rules.length >= Math.min(MAX_RULES, open.length)}
        onPress={() => setRules((all) => [...all, { id: nextId++ }])}
      />
      <AppText variant="small" muted>
        Don&apos;t see your stage? Add it to the pipeline above and save it first.
      </AppText>

      <View style={styles.buttons}>
        <Button title="Undo" variant="ghost" disabled={!dirty} onPress={() => setRules(toDrafts(settings.stageResets))} />
        <Button title="Save daily rules" loading={update.isPending} disabled={!dirty} onPress={save} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md },
  rule: { gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  ruleHeader: { flexDirection: "row", alignItems: "center" },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
