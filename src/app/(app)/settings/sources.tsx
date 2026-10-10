import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useSettingsUsage, useUpdateSources, useWorkspaceSettings } from "@/features/customization/hooks";
import { SETTINGS_LIMITS, type LeadSourceOption, type WorkspaceSettings } from "@/features/customization/types";
import { labelProblem, useDraftList, withoutIds } from "@/features/settings/draft-list";
import { IconButton } from "@/features/settings/components/icon-button";
import { MoveLeadsSheet, type RemovedWithLeads } from "@/features/settings/components/move-leads-sheet";
import { RowInput } from "@/features/settings/components/row-input";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

type SourceDraft = Omit<LeadSourceOption, "key"> & { key?: string };

/** Owners and admins: where leads come from, shown when adding a lead and on the dashboard. */
export default function SourcesScreen() {
  const settings = useWorkspaceSettings().data;
  return (
    <Screen>
      <AppText muted>Where your leads come from. Shown when adding a lead and on the dashboard.</AppText>
      <Card>
        {settings ? <SourcesForm key={JSON.stringify(settings.leadSources)} settings={settings} /> : <AppText muted>Loading…</AppText>}
      </Card>
    </Screen>
  );
}

function SourcesForm({ settings }: { settings: WorkspaceSettings }) {
  const usage = useSettingsUsage().data;
  const update = useUpdateSources();
  const list = useDraftList<SourceDraft>(settings.leadSources);
  const [moving, setMoving] = useState<RemovedWithLeads[] | null>(null);

  const dirty = JSON.stringify(withoutIds(list.items)) !== JSON.stringify(settings.leadSources);
  const removed = settings.leadSources.filter((s) => !list.items.some((d) => d.key === s.key));
  const targets = list.items
    .filter((d): d is typeof d & { key: string } => Boolean(d.key))
    .map((d) => ({ key: d.key, label: d.label }));

  function save(moveLeads?: Record<string, string>) {
    const problem =
      labelProblem(list.items.map((s) => s.label), "source") ?? (list.items.length === 0 ? "Keep at least one source." : null);
    if (problem) return Alert.alert("Check the sources", problem);
    const withLeads = removed
      .map((s) => ({ key: s.key, label: s.label, count: usage?.sources[s.key] ?? 0 }))
      .filter((r) => r.count > 0);
    if (!moveLeads && withLeads.length > 0) return setMoving(withLeads);

    update.mutate(
      { sources: withoutIds(list.items).map((s) => ({ ...s, label: s.label.trim() })), moveLeads },
      {
        onSuccess: () => {
          setMoving(null);
          Alert.alert("Lead sources saved");
        },
        onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
      },
    );
  }

  return (
    <View style={styles.wrapper}>
      {list.items.map((source) => (
        <View key={source.id} style={styles.row}>
          <RowInput
            value={source.label}
            maxLength={40}
            placeholder="Source name"
            accessibilityLabel="Source name"
            autoFocus={!source.key && !source.label}
            onChangeText={(label) => list.update(source.id, { label })}
          />
          <AppText variant="small" muted style={styles.count}>
            {source.key ? `${usage?.sources[source.key] ?? 0}` : "new"}
          </AppText>
          <IconButton
            icon="close"
            label={`Remove ${source.label || "source"}`}
            disabled={list.items.length === 1}
            onPress={() => list.remove(source.id)}
          />
        </View>
      ))}
      <AppText variant="small" muted>
        Numbers are how many leads have each source.
      </AppText>
      <Button
        title="Add source"
        variant="secondary"
        icon="add"
        disabled={list.items.length >= SETTINGS_LIMITS.sources}
        onPress={() => list.add({ label: "" })}
      />
      <View style={styles.buttons}>
        <Button title="Undo" variant="ghost" disabled={!dirty} onPress={() => list.reset(settings.leadSources)} />
        <Button title="Save sources" loading={update.isPending && !moving} disabled={!dirty} onPress={() => save()} style={styles.flex} />
      </View>
      <MoveLeadsSheet
        removed={moving}
        targets={targets}
        what="source"
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  count: { minWidth: 26, textAlign: "right" },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
