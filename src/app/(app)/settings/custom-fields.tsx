import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useSettingsUsage, useUpdateCustomFields, useWorkspaceSettings } from "@/features/customization/hooks";
import {
  CUSTOM_FIELD_TYPES,
  customFieldTypeLabels,
  SETTINGS_LIMITS,
  type CustomFieldDefinition,
  type CustomFieldType,
  type WorkspaceSettings,
} from "@/features/customization/types";
import { IconButton } from "@/features/settings/components/icon-button";
import { labelProblem, useDraftList, withoutIds } from "@/features/settings/draft-list";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Choices are edited as one comma-separated line, like the website. */
type FieldDraft = Omit<CustomFieldDefinition, "key" | "options"> & { key?: string; optionsText: string };

const toDraft = (field: CustomFieldDefinition): FieldDraft => ({
  key: field.key,
  label: field.label,
  type: field.type,
  required: field.required,
  optionsText: field.options.join(", "),
});
const parseOptions = (text: string) => [...new Set(text.split(",").map((o) => o.trim()).filter(Boolean))];

/** Owners and admins: extra details to capture on every lead (plans with custom fields). */
export default function CustomFieldsScreen() {
  const user = useCurrentUser();
  const settings = useWorkspaceSettings().data;
  const hasFeature = user.organization?.features.includes("customFields") ?? false;
  return (
    <Screen>
      <AppText muted>Extra details to capture on every lead, such as &ldquo;Plot size&rdquo; or &ldquo;Preferred area&rdquo;.</AppText>
      {!hasFeature ? (
        <Banner
          tone="info"
          title="Not included in your plan"
          message="Custom lead fields come with a higher plan. See More → Plan & usage."
        />
      ) : settings ? (
        <CustomFieldsForm key={JSON.stringify(settings.customFields)} settings={settings} />
      ) : (
        <AppText muted>Loading…</AppText>
      )}
    </Screen>
  );
}

function CustomFieldsForm({ settings }: { settings: WorkspaceSettings }) {
  const { colors } = useTheme();
  const usage = useSettingsUsage().data;
  const update = useUpdateCustomFields();
  const list = useDraftList<FieldDraft>(settings.customFields.map(toDraft));

  const payload = withoutIds(list.items).map(({ optionsText, ...field }) => ({
    ...field,
    label: field.label.trim(),
    options: field.type === "select" ? parseOptions(optionsText) : [],
  }));
  // Same key order on both sides, so only real changes count.
  const comparable = (fields: (Omit<CustomFieldDefinition, "key"> & { key?: string })[]) =>
    JSON.stringify(fields.map((f) => [f.key ?? null, f.label, f.type, f.options, f.required]));
  const dirty = comparable(payload) !== comparable(settings.customFields);
  const removedWithData = settings.customFields
    .filter((f) => !list.items.some((d) => d.key === f.key))
    .map((f) => ({ label: f.label, count: usage?.customFields[f.key] ?? 0 }))
    .filter((f) => f.count > 0);

  function send() {
    update.mutate(payload, {
      onSuccess: () => Alert.alert("Custom fields saved"),
      onError: (error) => Alert.alert("Couldn't save", getErrorMessage(error)),
    });
  }

  function save() {
    const problem =
      labelProblem(payload.map((f) => f.label), "field") ??
      (payload.some((f) => f.type === "select" && f.options.length === 0) ? "Give every dropdown at least one choice." : null);
    if (problem) return Alert.alert("Check the fields", problem);
    if (removedWithData.length > 0) {
      return Alert.alert(
        "Delete field data?",
        `${removedWithData.map((f) => `"${f.label}" (filled in on ${f.count} leads)`).join(", ")} will be removed from every lead. This can't be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove and save", style: "destructive", onPress: send },
        ],
      );
    }
    send();
  }

  return (
    <>
      {list.items.length === 0 && (
        <Card>
          <AppText muted>No custom fields yet. Add the details your team needs to capture on every lead.</AppText>
        </Card>
      )}
      {list.items.map((field, index) => (
        <Card key={field.id}>
          <View style={styles.header}>
            <AppText variant="label" style={styles.flex}>
              Field {index + 1}
              {field.key ? (
                <AppText variant="small" muted>{` · filled on ${usage?.customFields[field.key] ?? 0} leads`}</AppText>
              ) : null}
            </AppText>
            <IconButton icon="arrow-up" label="Move up" disabled={index === 0} onPress={() => list.move(field.id, -1)} />
            <IconButton
              icon="arrow-down"
              label="Move down"
              disabled={index === list.items.length - 1}
              onPress={() => list.move(field.id, 1)}
            />
            <IconButton icon="trash-outline" label="Remove field" danger onPress={() => list.remove(field.id)} />
          </View>
          <TextField
            label="Field name"
            value={field.label}
            onChangeText={(label) => list.update(field.id, { label })}
            placeholder="e.g. Plot size"
            maxLength={60}
          />
          <View style={styles.group}>
            <AppText variant="label">Type</AppText>
            <View style={styles.chips}>
              {CUSTOM_FIELD_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={customFieldTypeLabels[type]}
                  selected={field.type === type}
                  disabled={Boolean(field.key) && field.type !== type}
                  onPress={() => list.update(field.id, { type: type as CustomFieldType })}
                />
              ))}
            </View>
            {field.key && (
              <AppText variant="small" muted>
                The type can&apos;t change once a field is saved.
              </AppText>
            )}
          </View>
          {field.type === "select" && (
            <TextField
              label="Choices"
              value={field.optionsText}
              onChangeText={(optionsText) => list.update(field.id, { optionsText })}
              placeholder="e.g. 5 marla, 10 marla, 1 kanal"
              hint={`Separate with commas, up to ${SETTINGS_LIMITS.selectOptions}.`}
            />
          )}
          <View style={styles.switchRow}>
            <AppText style={styles.flex}>Required</AppText>
            <Switch
              value={field.required}
              onValueChange={(required) => list.update(field.id, { required })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Required"
            />
          </View>
        </Card>
      ))}
      <Button
        title="Add field"
        variant="secondary"
        icon="add"
        disabled={list.items.length >= SETTINGS_LIMITS.customFields}
        onPress={() => list.add({ label: "", type: "text", required: false, optionsText: "" })}
      />
      <View style={styles.buttons}>
        <Button title="Undo" variant="ghost" disabled={!dirty} onPress={() => list.reset(settings.customFields.map(toDraft))} />
        <Button title="Save fields" loading={update.isPending} disabled={!dirty} onPress={save} style={styles.flex} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.md },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
