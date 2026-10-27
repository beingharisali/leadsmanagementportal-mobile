import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useUpdateStageReset, useWorkspaceSettings } from "@/features/customization/hooks";
import { CLOSED_STAGES, type StageReset, type WorkspaceSettings } from "@/features/customization/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/**
 * Leads left in one open stage go back to another at midnight the next day,
 * keeping their agent. Only saved stages can be picked.
 */
export function StageResetForm() {
  const settings = useWorkspaceSettings().data;
  if (!settings) return <AppText muted>Loading…</AppText>;
  return <ResetForm key={JSON.stringify([settings.stageReset, settings.pipelineStages])} settings={settings} />;
}

function ResetForm({ settings }: { settings: WorkspaceSettings }) {
  const { colors } = useTheme();
  const update = useUpdateStageReset();
  const stages = settings.pipelineStages.filter((s) => !CLOSED_STAGES.includes(s.key));
  const initial = (): Partial<StageReset> => settings.stageReset ?? { to: stages[0]?.key };
  const [on, setOn] = useState(settings.stageReset !== null);
  const [rule, setRule] = useState<Partial<StageReset>>(initial);

  const dirty = JSON.stringify(on ? rule : null) !== JSON.stringify(settings.stageReset);
  const options = (skip?: string) => stages.filter((s) => s.key !== skip).map((s) => ({ value: s.key, label: s.label }));

  function save() {
    if (on && (!rule.from || !rule.to)) return Alert.alert("Pick both stages");
    if (on && rule.from === rule.to) return Alert.alert("Pick two different stages");
    update.mutate(on ? { from: rule.from!, to: rule.to! } : null, {
      onSuccess: () => Alert.alert(on ? "Daily reset saved" : "Daily reset turned off"),
      onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
    });
  }

  return (
    <View style={styles.form}>
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Move leads back the next day</AppText>
          <AppText variant="small" muted>
            A lead stays in the stage for the rest of the day it was moved there. At midnight (your company&apos;s time
            zone) it goes back, stays with the same agent, and its history shows the move.
          </AppText>
        </View>
        <Switch value={on} onValueChange={setOn} trackColor={{ true: colors.primary }} accessibilityLabel="Daily reset" />
      </View>

      {on && (
        <>
          <SelectField
            label="Leads in"
            placeholder="Pick a stage"
            value={rule.from ?? ""}
            options={options()}
            onChange={(from) => setRule((r) => ({ ...r, from, ...(r.to === from && { to: undefined }) }))}
          />
          <SelectField
            label="Go back to"
            placeholder="Pick a stage"
            value={rule.to ?? ""}
            options={options(rule.from)}
            onChange={(to) => setRule((r) => ({ ...r, to }))}
          />
          <AppText variant="small" muted>
            Don&apos;t see your stage? Add it to the pipeline above and save it first.
          </AppText>
        </>
      )}

      <View style={styles.buttons}>
        <Button
          title="Undo"
          variant="ghost"
          disabled={!dirty}
          onPress={() => {
            setOn(settings.stageReset !== null);
            setRule(initial());
          }}
        />
        <Button title="Save daily reset" loading={update.isPending} disabled={!dirty} onPress={save} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
