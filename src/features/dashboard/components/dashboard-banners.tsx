import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useLeadOptions } from "@/features/customization/hooks";
import { useLeads } from "@/features/leads/hooks";
import { useCanLoadSampleData, useLoadSampleData } from "@/features/onboarding/hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { InviteSheet } from "@/features/team/components/invite-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { linkParams } from "@/lib/link-params";
import { spacing } from "@/theme/colors";

/** Owners, until they finish or skip the setup wizard. */
export function SetupBanner() {
  const user = useCurrentUser();
  if (user.role !== "owner" || !user.organization?.setupPending) return null;
  return (
    <Banner
      tone="info"
      title={`Finish setting up ${user.organization.name}`}
      message="A few quick steps: company details, your pipeline, inviting agents and adding your first leads."
    >
      <Button title="Continue setup" variant="ghost" icon="arrow-forward" onPress={() => router.push("/setup")} style={styles.bannerButton} />
    </Banner>
  );
}

/** Owners and admins while the workspace has no leads yet. */
export function GettingStartedCard() {
  const canEdit = useCanEdit();
  const canLoadSamples = useCanLoadSampleData();
  const load = useLoadSampleData();
  const user = useCurrentUser();
  const hasImport = user.organization?.features.includes("import") ?? false;
  const [inviting, setInviting] = useState(false);

  function loadSamples() {
    load.mutate(undefined, {
      onSuccess: ({ created }) =>
        Alert.alert("Sample data loaded", `${created} sample leads were added. Delete them in one go from Settings later.`),
      onError: (error) => Alert.alert("Couldn't load sample data", getErrorMessage(error)),
    });
  }

  return (
    <Card>
      <AppText variant="heading">Let&apos;s get your first leads in</AppText>
      <AppText muted>
        Your workspace is empty. Add leads yourself, import a spreadsheet, or load sample data to see how the
        dashboard, pipeline and follow-ups work. Then invite your agents.
      </AppText>
      {canEdit && (
        <View style={styles.buttons}>
          <Button title="Add a lead" icon="add" onPress={() => router.push("/leads/new")} />
          {hasImport && (
            <Button title="Import from Excel" variant="secondary" icon="cloud-upload-outline" onPress={() => router.push("/leads/import")} />
          )}
          {canLoadSamples && (
            <Button
              title="Load sample data"
              variant="secondary"
              icon="sparkles-outline"
              loading={load.isPending}
              onPress={loadSamples}
            />
          )}
          <Button title="Invite agents" variant="secondary" icon="mail-outline" onPress={() => setInviting(true)} />
        </View>
      )}
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </Card>
  );
}

/** "5 leads haven't been contacted in 7+ days", when the company has stale alerts on. */
export function StaleLeadsBanner({ manager }: { manager: boolean }) {
  const { team } = useLeadOptions();
  const on = team.staleAfterDays > 0;
  const stale = useLeads({ stale: true, limit: 1 });
  const count = on ? (stale.data?.pages[0]?.meta.total ?? 0) : 0;
  if (count === 0) return null;

  return (
    <Banner
      tone="warning"
      title={`${count} ${manager ? "" : "of your "}${count === 1 ? "lead hasn't" : "leads haven't"} been contacted in ${team.staleAfterDays}+ days`}
      message="A quick call or message keeps them from going cold."
    >
      <Button
        title="Show them"
        variant="ghost"
        onPress={() => router.navigate({ pathname: "/leads", params: linkParams({ stale: "true" }) })}
        style={styles.bannerButton}
      />
    </Banner>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: spacing.sm },
  bannerButton: { alignSelf: "flex-start", minHeight: 32, paddingHorizontal: 0 },
});
