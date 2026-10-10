import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useLeadStats } from "@/features/leads/hooks";
import { useCompleteSetup, useDeleteSampleData, useLoadSampleData } from "@/features/onboarding/hooks";
import { DetailsCard, LogoCard } from "@/features/organizations/components/company-cards";
import { PipelineEditor } from "@/features/settings/components/pipeline-editor";
import { InviteSheet } from "@/features/team/components/invite-sheet";
import { PendingInvitations } from "@/features/team/components/pending-invitations";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const STEPS: { title: string; icon: IconName }[] = [
  { title: "Company", icon: "business-outline" },
  { title: "Pipeline", icon: "git-branch-outline" },
  { title: "Invite", icon: "person-add-outline" },
  { title: "Leads", icon: "people-outline" },
];

/**
 * The owner's first-run guide: company details, the pipeline, inviting agents
 * and adding the first leads. Every step can be skipped; Home links back here
 * until the owner finishes. Same steps as the website.
 */
export default function SetupScreen() {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const organization = user.organization;
  const complete = useCompleteSetup();
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  if (user.role !== "owner" || !organization) {
    return <EmptyView icon="lock-closed-outline" title="Only the owner can set up the company" />;
  }

  function finish() {
    complete.mutate(undefined, {
      onSuccess: () => {
        router.back();
        Alert.alert("You're all set", "Welcome to GetCloseWise!");
      },
      onError: (error) => Alert.alert("Couldn't finish setup", getErrorMessage(error)),
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `Set up ${organization.name}` }} />
      <AppText muted>Four quick steps to get your team working. Skip any of them and come back later.</AppText>
      <View style={styles.steps}>
        {STEPS.map(({ title, icon }, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <Pressable
              key={title}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setStep(index)}
              style={[
                styles.step,
                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.card },
              ]}
            >
              <Ionicons name={done ? "checkmark-circle" : icon} size={18} color={done || active ? colors.primary : colors.mutedText} />
              <AppText variant="small" weight={active ? "600" : "400"} numberOfLines={1}>
                {title}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {step === 0 && (
        <>
          <AppText variant="heading">Tell us about your company</AppText>
          <LogoCard organization={organization} />
          <DetailsCard organization={organization} submitLabel="Save and continue" onSaved={next} />
        </>
      )}
      {step === 1 && (
        <>
          <AppText variant="heading">Your sales pipeline</AppText>
          <AppText muted>
            Every lead moves through these stages. Rename, recolor, add or reorder them to match how your team sells. You can
            change them any time in Settings.
          </AppText>
          <Card>
            <PipelineEditor onSaved={next} />
          </Card>
        </>
      )}
      {step === 2 && <InviteStep onNext={next} />}
      {step === 3 && <LeadsStep />}

      <View style={styles.footer}>
        {step > 0 && <Button title="Back" variant="ghost" icon="arrow-back" onPress={back} />}
        <View style={styles.flex} />
        {step < STEPS.length - 1 ? (
          <Button title="Skip" variant="secondary" onPress={next} />
        ) : (
          <Button title="Finish setup" icon="checkmark" loading={complete.isPending} onPress={finish} />
        )}
      </View>
      <Button title="I'll finish later" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function InviteStep({ onNext }: { onNext: () => void }) {
  const [inviting, setInviting] = useState(false);
  return (
    <>
      <AppText variant="heading">Invite your agents</AppText>
      <AppText muted>Each person gets an email with a link to set their own password. Links work for 7 days.</AppText>
      <Button title="Invite by email" icon="mail-outline" onPress={() => setInviting(true)} />
      <PendingInvitations canWrite />
      <Button title="Continue" variant="secondary" icon="arrow-forward" onPress={onNext} />
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

function LeadsStep() {
  const organization = useCurrentUser().organization!;
  const stats = useLeadStats();
  const load = useLoadSampleData();
  const remove = useDeleteSampleData();
  const total = stats.data?.total ?? 0;
  const hasImport = organization.features.includes("import");

  return (
    <>
      <AppText variant="heading">Add your first leads</AppText>
      <AppText muted>
        {total > 0 ? `You have ${total} ${total === 1 ? "lead" : "leads"} so far.` : "Pick whichever is easiest. You can do the others later."}
      </AppText>
      <Option icon="add" title="Add a lead" description="Type in one lead you're working on right now.">
        <Button title="Add lead" onPress={() => router.push("/leads/new")} />
      </Option>
      {hasImport && (
        <Option icon="cloud-upload-outline" title="Import a spreadsheet" description="Bring in leads from Excel or CSV and assign them to agents.">
          <Button title="Import leads" variant="secondary" onPress={() => router.push("/leads/import")} />
        </Option>
      )}
      <Option
        icon="sparkles-outline"
        title="Try sample data"
        description={
          organization.hasSampleData
            ? "Sample leads are loaded. Delete them in one tap when you're done exploring."
            : "Load demo leads across the pipeline to see how everything works."
        }
      >
        {organization.hasSampleData ? (
          <Button
            title="Delete sample data"
            variant="secondary"
            loading={remove.isPending}
            onPress={() => remove.mutate(undefined, { onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)) })}
          />
        ) : (
          <Button
            title="Load sample data"
            variant="secondary"
            loading={load.isPending}
            onPress={() => load.mutate(undefined, { onError: (error) => Alert.alert("Couldn't load it", getErrorMessage(error)) })}
          />
        )}
      </Option>
    </>
  );
}

function Option({ icon, title, description, children }: { icon: IconName; title: string; description: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.optionHeader}>
        <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText weight="600">{title}</AppText>
          <AppText variant="small" muted>
            {description}
          </AppText>
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  steps: { flexDirection: "row", gap: spacing.xs + 2 },
  step: { flex: 1, alignItems: "center", gap: 2, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionHeader: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  optionIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
