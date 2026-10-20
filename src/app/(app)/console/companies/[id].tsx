import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import type { BillingStatus } from "@/features/organizations/types";
import { OrganizationStatusBadge } from "@/features/platform/components/company-row";
import { DeleteCompanySheet } from "@/features/platform/components/delete-company-sheet";
import { InvoiceSheet } from "@/features/platform/components/invoice-sheet";
import { OptionalDateField } from "@/features/platform/components/optional-date-field";
import { SupportSheet } from "@/features/platform/components/support-sheet";
import {
  BILLING_STATUSES,
  billingStatusLabels,
  endOfDayIso,
  usePlatformOrganization,
  useResetDemo,
  useUpdateOrganization,
  type PlatformOrganizationDetail,
} from "@/features/platform/hooks";
import {
  PLAN_KEYS,
  PLATFORM_GRANTED_FEATURES,
  formatBytes,
  planFeatureLabels,
  planLabels,
  type PlanFeature,
  type PlanKey,
} from "@/features/plans/types";
import { userRoleLabels } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Heapware staff: one company's usage, plan and billing, its admins, and billing and support actions. */
export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const company = usePlatformOrganization(id);
  if (company.isPending) return <LoadingView />;
  if (!company.data) return <ErrorView error={company.error} onRetry={() => void company.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: company.data.name }} />
      {/* Remounts with fresh values after every save. */}
      <ManageCompany key={company.data.updatedAt} organization={company.data} onRefresh={() => company.refetch()} />
    </>
  );
}

const sourceLabels: Record<PlatformOrganizationDetail["source"], string> = {
  signup: "self sign-up",
  migration: "original Heapware data",
  platform: "added by Heapware",
};

function ManageCompany({ organization, onRefresh }: { organization: PlatformOrganizationDetail; onRefresh: () => Promise<unknown> }) {
  const { colors } = useTheme();
  const me = useCurrentUser();
  const update = useUpdateOrganization();
  const resetDemo = useResetDemo();
  const isOwn = me.organization?.id === organization.id;
  const suspended = organization.status === "suspended";

  const [name, setName] = useState(organization.name);
  const [plan, setPlan] = useState<PlanKey>(organization.plan);
  const [billing, setBilling] = useState<BillingStatus>(organization.billingStatus);
  const [trialEnds, setTrialEnds] = useState<Date | null>(organization.trialEndsAt ? new Date(organization.trialEndsAt) : null);
  const [paidUntil, setPaidUntil] = useState<Date | null>(organization.paidUntil ? new Date(organization.paidUntil) : null);
  const [nameError, setNameError] = useState<string>();
  const [sheet, setSheet] = useState<"invoice" | "support" | "delete" | null>(null);

  function toggleFeature(feature: PlanFeature, enabled: boolean) {
    update.mutate(
      { id: organization.id, payload: { featureOverrides: { [feature]: enabled } } },
      {
        onSuccess: () => Alert.alert(`${planFeatureLabels[feature]} ${enabled ? "enabled" : "disabled"}`),
        onError: (error) => Alert.alert("Couldn't change features", getErrorMessage(error)),
      },
    );
  }

  function save() {
    if (name.trim().length < 2) return setNameError("Company name is required");
    setNameError(undefined);
    update.mutate(
      {
        id: organization.id,
        payload: {
          name: name.trim(),
          plan,
          billingStatus: billing,
          ...(billing === "trial" && trialEnds && { trialEndsAt: endOfDayIso(trialEnds) }),
          ...(billing === "paid" && { paidUntil: paidUntil ? endOfDayIso(paidUntil) : null }),
        },
      },
      {
        onSuccess: () => Alert.alert(`${name.trim()} updated`),
        onError: (error) => Alert.alert("Couldn't save the changes", getErrorMessage(error)),
      },
    );
  }

  function toggleStatus() {
    Alert.alert(
      suspended ? `Activate ${organization.name}?` : `Suspend ${organization.name}?`,
      suspended
        ? "Their team can sign in again and pick up where they left off."
        : "Everyone in this company is signed out and can't sign in until you activate it again. Their data is kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: suspended ? "Activate" : "Suspend",
          style: suspended ? "default" : "destructive",
          onPress: () =>
            update.mutate(
              { id: organization.id, payload: { status: suspended ? "active" : "suspended" } },
              {
                onSuccess: () =>
                  Alert.alert(suspended ? `${organization.name} is active again` : `${organization.name} is suspended`),
                onError: (error) => Alert.alert("Couldn't change its status", getErrorMessage(error)),
              },
            ),
        },
      ],
    );
  }

  function confirmResetDemo() {
    Alert.alert("Reset the demo now?", "Every change in the public demo is replaced with fresh sample data. It also resets itself every night.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset demo",
        style: "destructive",
        onPress: () =>
          resetDemo.mutate(undefined, {
            onSuccess: () => Alert.alert("Demo reset with fresh data"),
            onError: (error) => Alert.alert("Couldn't reset the demo", getErrorMessage(error)),
          }),
      },
    ]);
  }

  const usage: [string, string][] = [
    ["Users", `${organization.usage.activeUsers} / ${organization.limits.users}`],
    ["Leads", `${organization.usage.leads.toLocaleString()} / ${organization.limits.leads.toLocaleString()}`],
    ["Storage", `${formatBytes(organization.usage.storageBytes)} / ${formatBytes(organization.limits.storageBytes)}`],
    ["Last sign-in", organization.usage.lastLoginAt ? formatDateTime(organization.usage.lastLoginAt) : "Never"],
  ];

  return (
    <Screen onRefresh={onRefresh}>
      <View style={styles.headline}>
        <OrganizationStatusBadge organization={organization} />
        <AppText variant="small" muted>
          Joined {formatDate(organization.createdAt)} · {sourceLabels[organization.source]}
        </AppText>
      </View>

      <View style={styles.tiles}>
        {usage.map(([label, value]) => (
          <View key={label} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="small" muted>
              {label}
            </AppText>
            <AppText weight="600" numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </AppText>
          </View>
        ))}
      </View>

      {organization.blockedReason ? (
        <Banner tone="danger" message={`Users can't sign in: ${organization.blockedReason}`} />
      ) : organization.readOnlyReason ? (
        <Banner tone="warning" message={`Read-only: ${organization.readOnlyReason}`} />
      ) : null}

      <Card>
        <AppText variant="heading">Plan and billing</AppText>
        <TextField label="Company name" value={name} onChangeText={setName} error={nameError} maxLength={120} />
        <View style={styles.group}>
          <AppText variant="label">Plan</AppText>
          <View style={styles.chips}>
            {PLAN_KEYS.map((p) => (
              <Chip key={p} label={planLabels[p]} selected={plan === p} onPress={() => setPlan(p)} />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="label">Billing</AppText>
          <View style={styles.chips}>
            {BILLING_STATUSES.map((b) => (
              <Chip key={b} label={billingStatusLabels[b]} selected={billing === b} onPress={() => setBilling(b)} />
            ))}
          </View>
        </View>
        {billing === "trial" ? (
          <OptionalDateField
            label="Trial ends"
            value={trialEnds}
            onChange={setTrialEnds}
            hint="Move it forward to extend the trial. After it the workspace is read-only."
          />
        ) : (
          <OptionalDateField
            label="Paid until"
            value={paidUntil}
            onChange={setPaidUntil}
            hint="Move it forward when a payment comes in. Leave empty for no end date."
          />
        )}
        <Button title="Save changes" icon="checkmark" loading={update.isPending && !update.variables?.payload.status} onPress={save} />
      </Card>

      {!isOwn && (
        <Card>
          <AppText variant="heading">Features</AppText>
          <AppText variant="small" muted>
            Turn add-on features on or off for this company.
          </AppText>
          <View style={styles.chips}>
            {PLATFORM_GRANTED_FEATURES.map((feature) => {
              const on = organization.features.includes(feature);
              return (
                <Chip
                  key={feature}
                  label={`${planFeatureLabels[feature]}: ${on ? "On" : "Off"}`}
                  selected={on}
                  onPress={() => !update.isPending && toggleFeature(feature, !on)}
                />
              );
            })}
          </View>
        </Card>
      )}

      <Card>
        <AppText variant="heading">Owner and admins</AppText>
        {organization.admins.map((admin) => (
          <View key={admin.id} style={[styles.admin, { borderTopColor: colors.border }]}>
            <View style={styles.flex}>
              <AppText weight="600" numberOfLines={1}>
                {admin.name}
                {!admin.isActive && (
                  <AppText variant="small" muted>
                    {" "}
                    (inactive)
                  </AppText>
                )}
              </AppText>
              <AppText variant="small" muted numberOfLines={1}>
                {admin.email}
                {admin.phone ? ` · ${admin.phone}` : ""}
              </AppText>
            </View>
            <Badge label={userRoleLabels[admin.role]} color={admin.role === "owner" ? "indigo" : "slate"} />
          </View>
        ))}
      </Card>

      {!isOwn && (
        <Card>
          <AppText variant="heading">Billing and support</AppText>
          <Button title="Create invoice" variant="secondary" icon="document-text-outline" onPress={() => setSheet("invoice")} />
          {organization.isDemo && (
            <Button
              title="Reset demo now"
              variant="secondary"
              icon="refresh"
              loading={resetDemo.isPending}
              onPress={confirmResetDemo}
            />
          )}
          <Button
            title="Sign in as user"
            variant="secondary"
            icon="log-in-outline"
            disabled={suspended}
            onPress={() => setSheet("support")}
          />
          <Button
            title={suspended ? "Activate" : "Suspend"}
            variant={suspended ? "secondary" : "danger"}
            icon={suspended ? "checkmark-circle-outline" : "ban-outline"}
            loading={update.isPending && !!update.variables?.payload.status}
            onPress={toggleStatus}
          />
          {!organization.isDemo && (
            <Button title="Delete company" variant="ghost" icon="trash-outline" onPress={() => setSheet("delete")} />
          )}
        </Card>
      )}

      <InvoiceSheet organization={organization} open={sheet === "invoice"} onClose={() => setSheet(null)} />
      <SupportSheet organization={organization} open={sheet === "support"} onClose={() => setSheet(null)} />
      {!isOwn && !organization.isDemo && (
        <DeleteCompanySheet
          organization={organization}
          open={sheet === "delete"}
          onClose={() => setSheet(null)}
          onDeleted={() => router.back()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  headline: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  group: { gap: spacing.xs + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  admin: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
