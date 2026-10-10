import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import {
  useDeleteTag,
  useRenameTag,
  useSettingsUsage,
  useUpdateTags,
  useWorkspaceSettings,
} from "@/features/customization/hooks";
import { COLOR_NAMES, type ColorName, type TagOption } from "@/features/customization/types";
import { ColorPicker } from "@/features/settings/components/color-picker";
import { IconButton } from "@/features/settings/components/icon-button";
import { RowInput } from "@/features/settings/components/row-input";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const normalize = (tag: string) => tag.trim().toLowerCase().slice(0, 30);

/**
 * Owners and admins: the company's tags. Coloured tags are suggested first when
 * tagging a lead; tags already used on leads are listed too, so they can be
 * coloured, renamed (on every lead) or removed from every lead.
 */
export default function TagsScreen() {
  const { colors } = useTheme();
  const settings = useWorkspaceSettings().data;
  const usage = useSettingsUsage().data;
  const updateTags = useUpdateTags();
  const deleteTag = useDeleteTag();
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<ColorName>("sky");
  const [renaming, setRenaming] = useState<string | null>(null);

  const library = settings?.tags ?? [];
  const counts = new Map(usage?.tags.map((t) => [t.name, t.count]) ?? []);
  const names = [...new Set([...library.map((t) => t.name), ...(usage?.tags.map((t) => t.name) ?? [])])];
  const rows = names
    .map((name) => ({ name, color: library.find((t) => t.name === name)?.color ?? null, count: counts.get(name) ?? 0 }))
    .sort((a, b) => Number(!a.color) - Number(!b.color) || b.count - a.count || a.name.localeCompare(b.name));

  function saveLibrary(tags: TagOption[]) {
    updateTags.mutate(tags, { onError: (error) => Alert.alert("Couldn't save the tags", getErrorMessage(error)) });
  }

  function setColor(name: string, color: ColorName) {
    const exists = library.some((t) => t.name === name);
    saveLibrary(exists ? library.map((t) => (t.name === name ? { ...t, color } : t)) : [...library, { name, color }]);
  }

  function addTag() {
    const name = normalize(draft);
    if (!name) return;
    if (library.some((t) => t.name === name)) return Alert.alert("That tag is already in the list");
    saveLibrary([...library, { name, color: draftColor }]);
    setDraft("");
    setDraftColor(COLOR_NAMES[(COLOR_NAMES.indexOf(draftColor) + 3) % COLOR_NAMES.length]!);
  }

  function confirmDelete(name: string) {
    Alert.alert(
      `Delete the tag "${name}"?`,
      `It's removed from ${counts.get(name) ?? 0} lead(s) and from your tag list. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete tag",
          style: "destructive",
          onPress: () => deleteTag.mutate(name, { onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)) }),
        },
      ],
    );
  }

  return (
    <Screen>
      <AppText muted>Colour your tags and keep them tidy. Renaming or deleting a tag changes every lead that has it.</AppText>
      <Card>
        <View style={styles.row}>
          <ColorPicker value={draftColor} onChange={setDraftColor} label="New tag colour" />
          <RowInput
            value={draft}
            onChangeText={setDraft}
            maxLength={30}
            placeholder="New tag, e.g. priority"
            accessibilityLabel="New tag"
            autoCapitalize="none"
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <Button title="Add" variant="secondary" disabled={!normalize(draft) || updateTags.isPending} onPress={addTag} style={styles.add} />
        </View>
      </Card>
      <Card>
        {!settings ? (
          <AppText muted>Loading…</AppText>
        ) : rows.length === 0 ? (
          <AppText muted>No tags yet. Add one above, or tag a lead.</AppText>
        ) : (
          rows.map((row, index) => (
            <View
              key={row.name}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, styles.tagRow]}
            >
              <ColorPicker
                value={row.color ?? "slate"}
                onChange={(color) => setColor(row.name, color)}
                label={row.color ? `${row.name} colour` : `Give ${row.name} a colour`}
              />
              <View style={styles.flex}>
                <Badge label={row.name} color={row.color ?? "slate"} />
                <AppText variant="small" muted>
                  {row.count} {row.count === 1 ? "lead" : "leads"}
                  {!row.color ? " · not in your tag list" : ""}
                </AppText>
              </View>
              <IconButton icon="pencil" label={`Rename ${row.name}`} onPress={() => setRenaming(row.name)} />
              <IconButton icon="trash-outline" label={`Delete ${row.name}`} danger onPress={() => confirmDelete(row.name)} />
            </View>
          ))
        )}
      </Card>
      <RenameSheet tag={renaming} onClose={() => setRenaming(null)} />
    </Screen>
  );
}

function RenameSheet(props: { tag: string | null; onClose: () => void }) {
  return <RenameBody key={useOpenKey(!!props.tag)} {...props} />;
}

function RenameBody({ tag, onClose }: { tag: string | null; onClose: () => void }) {
  const rename = useRenameTag();
  const [name, setName] = useState(tag ?? "");
  const next = normalize(name);
  return (
    <Sheet
      open={!!tag}
      onClose={onClose}
      title="Rename tag"
      subtitle={`Every lead tagged "${tag}" gets the new name. If a tag with the new name exists, the two are merged.`}
      footer={
        <Button
          title="Rename"
          loading={rename.isPending}
          disabled={!next || next === tag}
          onPress={() =>
            tag &&
            rename.mutate(
              { from: tag, to: next },
              { onSuccess: onClose, onError: (error) => Alert.alert("Couldn't rename it", getErrorMessage(error)) },
            )
          }
        />
      }
    >
      <TextField label="New name" value={name} onChangeText={setName} maxLength={30} autoCapitalize="none" autoFocus />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tagRow: { paddingVertical: spacing.sm },
  add: { minHeight: 40, paddingHorizontal: spacing.md },
});
