import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useSettingsUsage, useUpdatePipeline, useWorkspaceSettings } from "@/features/customization/hooks";
import {
  CLOSED_STAGES,
  COLOR_NAMES,
  LOST_STAGE,
  SETTINGS_LIMITS,
  type PipelineStage,
  type WorkspaceSettings,
} from "@/features/customization/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { labelProblem, useDraftList, withoutIds } from "../draft-list";
import { ColorPicker } from "./color-picker";
import { IconButton } from "./icon-button";
import { MoveLeadsSheet, type RemovedWithLeads } from "./move-leads-sheet";
import { RowInput } from "./row-input";

type StageDraft = Omit<PipelineStage, "key"> & { key?: string };
const isOpen = (key?: string) => !key || !CLOSED_STAGES.includes(key);

/**
 * Add, rename, reorder and recolor pipeline stages. Won and Lost always close
 * the pipeline: they can be renamed and recolored but not moved or removed.
 */
export function PipelineEditor({ onSaved }: { onSaved?: () => void }) {
  const settings = useWorkspaceSettings().data;
  if (!settings) return <AppText muted>Loading…</AppText>;
  // Fresh drafts whenever the saved pipeline changes.
  return <PipelineForm key={JSON.stringify(settings.pipelineStages)} settings={settings} onSaved={onSaved} />;
}

function PipelineForm({ settings, onSaved }: { settings: WorkspaceSettings; onSaved?: () => void }) {
  const { colors } = useTheme();
  const usage = useSettingsUsage().data;
  const update = useUpdatePipeline();
  const open = useDraftList<StageDraft>(settings.pipelineStages.filter((s) => isOpen(s.key)));
  const closed = useDraftList<StageDraft>(settings.pipelineStages.filter((s) => !isOpen(s.key)));
  const [moving, setMoving] = useState<RemovedWithLeads[] | null>(null);

  const all = [...open.items, ...closed.items];
  const dirty = JSON.stringify(withoutIds(all)) !== JSON.stringify(settings.pipelineStages.map((s) => ({ ...s })));
  const removed = settings.pipelineStages.filter((s) => !all.some((d) => d.key === s.key));
  const targets = all
    .filter((d): d is typeof d & { key: string } => Boolean(d.key) && d.key !== LOST_STAGE)
    .map((d) => ({ key: d.key, label: d.label }));

  function save(moveLeads?: Record<string, string>) {
    const problem =
      labelProblem(all.map((s) => s.label), "stage") ?? (open.items.length === 0 ? "Keep at least one open stage." : null);
    if (problem) return Alert.alert("Check the stages", problem);

    const withLeads = removed
      .map((s) => ({ key: s.key, label: s.label, count: usage?.stages[s.key] ?? 0 }))
      .filter((r) => r.count > 0);
    if (!moveLeads && withLeads.length > 0) return setMoving(withLeads);

    update.mutate(
      { stages: withoutIds(all).map((s) => ({ ...s, label: s.label.trim() })), moveLeads },
      {
        onSuccess: () => {
          setMoving(null);
          if (onSaved) onSaved();
          else Alert.alert("Pipeline saved");
        },
        onError: (error) => Alert.alert("Couldn't save the pipeline", getErrorMessage(error)),
      },
    );
  }

  function addStage() {
    const used = new Set(all.map((s) => s.color));
    open.add({ label: "", color: COLOR_NAMES.find((c) => !used.has(c)) ?? "slate" });
  }

  const count = (key?: string) => (key ? `${usage?.stages[key] ?? 0}` : "new");

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <AppText variant="label">Open stages</AppText>
        <AppText variant="small" muted>
          New leads start in the first one
        </AppText>
      </View>
      {open.items.map((stage, index) => (
        <View key={stage.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ColorPicker value={stage.color} onChange={(color) => open.update(stage.id, { color })} label="Stage colour" />
          <RowInput
            value={stage.label}
            maxLength={40}
            placeholder="Stage name"
            accessibilityLabel={`Stage ${index + 1} name`}
            autoFocus={!stage.key && !stage.label}
            onChangeText={(label) => open.update(stage.id, { label })}
          />
          <AppText variant="small" muted style={styles.count}>
            {count(stage.key)}
          </AppText>
          <IconButton icon="arrow-up" label="Move up" disabled={index === 0} onPress={() => open.move(stage.id, -1)} />
          <IconButton
            icon="arrow-down"
            label="Move down"
            disabled={index === open.items.length - 1}
            onPress={() => open.move(stage.id, 1)}
          />
          <IconButton
            icon="trash-outline"
            label="Remove stage"
            danger
            disabled={open.items.length === 1}
            onPress={() => open.remove(stage.id)}
          />
        </View>
      ))}
      <Button title="Add stage" variant="secondary" icon="add" onPress={addStage} disabled={all.length >= SETTINGS_LIMITS.stages} />

      <View style={styles.sectionHeader}>
        <AppText variant="label">Closing stages</AppText>
        <AppText variant="small" muted>
          Always last; used for win rate and lost reasons
        </AppText>
      </View>
      {closed.items.map((stage) => (
        <View key={stage.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="lock-closed" size={14} color={colors.mutedText} />
          <ColorPicker value={stage.color} onChange={(color) => closed.update(stage.id, { color })} label="Stage colour" />
          <RowInput
            value={stage.label}
            maxLength={40}
            accessibilityLabel={stage.key === LOST_STAGE ? "Lost stage name" : "Won stage name"}
            onChangeText={(label) => closed.update(stage.id, { label })}
          />
          <AppText variant="small" muted style={styles.count}>
            {count(stage.key)}
          </AppText>
        </View>
      ))}
      <AppText variant="small" muted>
        Numbers are how many leads are in each stage.
      </AppText>

      <View style={styles.buttons}>
        <Button
          title="Undo"
          variant="ghost"
          disabled={!dirty || update.isPending}
          onPress={() => {
            open.reset(settings.pipelineStages.filter((s) => isOpen(s.key)));
            closed.reset(settings.pipelineStages.filter((s) => !isOpen(s.key)));
          }}
        />
        <Button
          title="Save pipeline"
          loading={update.isPending && !moving}
          disabled={!dirty && !onSaved}
          onPress={() => (dirty ? save() : onSaved?.())}
          style={styles.flex}
        />
      </View>

      <MoveLeadsSheet
        removed={moving}
        targets={targets}
        what="stage"
        pending={update.isPending}
        onCancel={() => setMoving(null)}
        onConfirm={(moveLeads) => save(moveLeads)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: spacing.sm },
  sectionHeader: { gap: 2, marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  count: { minWidth: 26, textAlign: "right" },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
