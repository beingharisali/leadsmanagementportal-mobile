import { useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { fillTemplate, templateValues, useTemplates, type MessageTemplate } from "@/features/templates/hooks";
import { whatsappUrl } from "@/lib/format";
import { spacing } from "@/theme/colors";

import { useLogMessage } from "../hooks";
import type { Lead } from "../types";

interface MessageSheetProps {
  lead: Lead;
  channel: "whatsapp" | "email" | null;
  onClose: () => void;
}

/**
 * Type a WhatsApp message or email, open it in WhatsApp / the mail app, and
 * save it in the lead's history (which also counts as contacting them).
 */
export function MessageSheet(props: MessageSheetProps) {
  return <MessageSheetBody key={useOpenKey(!!props.channel)} {...props} />;
}

function MessageSheetBody({ lead, channel, onClose }: MessageSheetProps) {
  const user = useCurrentUser();
  const logMessage = useLogMessage(lead.id);
  const templates = useTemplates(channel);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  // A greeting and signature to type between.
  const [body, setBody] = useState(
    () =>
      `Assalam o Alaikum ${lead.name.split(" ")[0]},\n\n\n\nRegards,\n${user.name}${user.organization ? `\n${user.organization.name}` : ""}`,
  );

  function applyTemplate(template: MessageTemplate) {
    const values = templateValues(lead, user.name, user.organization?.name ?? "");
    setBody(fillTemplate(template.body, values));
    if (template.subject) setSubject(fillTemplate(template.subject, values));
    setTemplateName(template.name);
  }

  async function send() {
    if (!channel) return;
    const text = body.trim();
    const url =
      channel === "whatsapp"
        ? whatsappUrl(lead.phone, text)
        : `mailto:${lead.email}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        channel === "whatsapp" ? "Couldn't open WhatsApp" : "Couldn't open your email app",
        channel === "whatsapp" ? "Check that WhatsApp is installed." : "Check that an email app is set up.",
      );
      return;
    }
    // Best effort: the message is already on its way in the other app.
    logMessage.mutate({
      channel,
      body: text,
      ...(subject.trim() && { subject: subject.trim() }),
      ...(templateName && { templateName }),
    });
    onClose();
  }

  return (
    <Sheet
      open={!!channel}
      onClose={onClose}
      title={channel === "whatsapp" ? "WhatsApp message" : "Email"}
      subtitle={channel === "whatsapp" ? `To ${lead.name} · ${lead.phone}` : `To ${lead.name} · ${lead.email ?? ""}`}
      footer={
        <Button
          title={channel === "whatsapp" ? "Open WhatsApp" : "Open email app"}
          icon={channel === "whatsapp" ? "logo-whatsapp" : "mail-outline"}
          disabled={!body.trim()}
          onPress={() => void send()}
        />
      }
    >
      {(templates.data?.length ?? 0) > 0 && (
        <View style={styles.templates}>
          <AppText variant="label">Templates</AppText>
          <View style={styles.chips}>
            {templates.data!.map((template) => (
              <Chip
                key={template.id}
                label={template.name}
                selected={templateName === template.name}
                onPress={() => applyTemplate(template)}
              />
            ))}
          </View>
        </View>
      )}
      {channel === "email" && (
        <TextField label="Subject" value={subject} onChangeText={setSubject} maxLength={200} />
      )}
      <TextField
        label="Message"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={4000}
        style={{ minHeight: 160, textAlignVertical: "top" }}
        hint="Saved in the lead's history when you open it."
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  templates: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
