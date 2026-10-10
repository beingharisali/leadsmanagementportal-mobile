import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import {
  channelLabels,
  fillTemplate,
  TEMPLATE_PLACEHOLDERS,
  templateValues,
  useAllTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
  type MessageChannel,
  type MessageTemplate,
} from "@/features/templates/hooks";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** The lead used for previews, same as the website's. */
const PREVIEW_LEAD = { name: "Ahmed Raza", businessName: "Raza Textiles", phone: "0300 1234567", email: "ahmed@razatextiles.pk", city: "Lahore" };

/** Write or change a template (`?id=` to edit). */
export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const templates = useAllTemplates();
  if (id && templates.isPending) return <LoadingView />;
  const template = id ? templates.data?.find((t) => t.id === id) : undefined;
  return <TemplateForm key={template?.id ?? "new"} template={template} />;
}

function TemplateForm({ template }: { template?: MessageTemplate }) {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();
  const [channel, setChannel] = useState<MessageChannel>(template?.channel ?? "whatsapp");
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = create.isPending || update.isPending;
  const preview = templateValues(PREVIEW_LEAD, user.name, user.organization?.name ?? "Your company");

  function save() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Give it a name";
    if (!body.trim()) found.body = "Write the message";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const payload = {
      name: name.trim(),
      channel,
      body: body.trim(),
      ...(channel === "email" && subject.trim() && { subject: subject.trim() }),
    };
    const options = {
      onSuccess: () => router.back(),
      onError: (error: unknown) => {
        if (error instanceof ApiClientError && error.errors) {
          setErrors(Object.fromEntries(error.errors.map((e) => [e.path, e.message])));
        }
        Alert.alert("Couldn't save the template", getErrorMessage(error));
      },
    };
    if (template) update.mutate({ id: template.id, payload }, options);
    else create.mutate(payload, options);
  }

  function confirmDelete() {
    if (!template) return;
    Alert.alert(`Delete "${template.name}"?`, "Agents won't be able to use it anymore. Messages already sent stay in each lead's history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(template.id, {
            onSuccess: () => router.back(),
            onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)),
          }),
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: template ? "Edit template" : "New template" }} />
      <Card>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. First hello" maxLength={80} error={errors.name} />
        <View style={styles.group}>
          <AppText variant="label">Send by</AppText>
          <View style={styles.chips}>
            {(["whatsapp", "email"] as const).map((c) => (
              <Chip key={c} label={channelLabels[c]} selected={channel === c} onPress={() => setChannel(c)} />
            ))}
          </View>
        </View>
        {channel === "email" && <TextField label="Subject" value={subject} onChangeText={setSubject} maxLength={200} />}
        <TextField
          label="Message"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={4000}
          error={errors.body}
          style={styles.body}
        />
        <AppText variant="label">Insert</AppText>
        <View style={styles.chips}>
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <Chip key={p.key} label={p.description} onPress={() => setBody((b) => `${b}{{${p.key}}}`)} />
          ))}
        </View>
      </Card>
      <Card>
        <AppText variant="label">Preview</AppText>
        <View style={[styles.preview, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {channel === "email" && subject ? <AppText weight="600">{fillTemplate(subject, preview)}</AppText> : null}
          <AppText>{body ? fillTemplate(body, preview) : "Your message shows here."}</AppText>
        </View>
        <AppText variant="small" muted>
          Shown for a sample lead, {PREVIEW_LEAD.name} of {PREVIEW_LEAD.businessName}.
        </AppText>
      </Card>
      <Button title={template ? "Save changes" : "Create template"} icon="checkmark" loading={pending} onPress={save} />
      {template && <Button title="Delete template" variant="ghost" icon="trash-outline" loading={remove.isPending} onPress={confirmDelete} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  body: { minHeight: 140, textAlignVertical: "top" },
  preview: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
});
