import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useCanEdit } from "@/features/organizations/hooks";
import { channelLabels, useAllTemplates } from "@/features/templates/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Owners and admins: ready-made WhatsApp messages and emails agents send from a lead in one tap. */
export default function TemplatesScreen() {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const canEdit = useCanEdit();
  const templates = useAllTemplates();
  const hasFeature = user.organization?.features.includes("templates") ?? false;
  const canWrite = canEdit && hasFeature;
  const list = templates.data ?? [];

  return (
    <Screen onRefresh={() => templates.refetch()}>
      <Stack.Screen
        options={{
          headerRight: canWrite
            ? () => <HeaderButton label="New template" icon="add-circle-outline" onPress={() => router.push("/settings/templates/edit")} />
            : undefined,
        }}
      />
      <AppText muted>
        Agents pick one on a lead&apos;s screen and it opens with the lead&apos;s details filled in.
      </AppText>
      {!hasFeature && (
        <Banner
          tone="info"
          title="Not included in your plan"
          message="You can keep using and deleting your templates, but your plan doesn't include writing new ones."
        />
      )}
      {templates.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : templates.error ? (
        <AppText muted>{getErrorMessage(templates.error)}</AppText>
      ) : list.length === 0 ? (
        <>
          <EmptyView
            icon="chatbubbles-outline"
            title="No templates yet"
            message="Save the messages your team sends most, like a first hello or a proposal follow-up."
          />
          {canWrite && <Button title="New template" icon="add" onPress={() => router.push("/settings/templates/edit")} />}
        </>
      ) : (
        list.map((template) => (
          <Pressable
            key={template.id}
            accessibilityRole="button"
            disabled={!canEdit}
            onPress={() => router.push({ pathname: "/settings/templates/edit", params: { id: template.id } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            <View style={styles.header}>
              <AppText weight="600" style={styles.flex} numberOfLines={1}>
                {template.name}
              </AppText>
              <Badge label={channelLabels[template.channel]} color={template.channel === "whatsapp" ? "emerald" : "sky"} />
            </View>
            {template.subject ? <AppText variant="small" weight="600">{template.subject}</AppText> : null}
            <AppText variant="small" muted numberOfLines={4}>
              {template.body}
            </AppText>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
