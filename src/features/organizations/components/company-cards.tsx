import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { logoSource, useRemoveLogo, useUpdateCompany, useUploadLogo, type CompanyDetails } from "@/features/organizations/company-hooks";
import { useCanEdit } from "@/features/organizations/hooks";
import { TEAM_SIZES, type OrganizationSummary } from "@/features/organizations/types";
import { planLabels } from "@/features/plans/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { formatDate, getInitials } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const INDUSTRY_SUGGESTIONS = [
  "Real estate",
  "Automotive",
  "Education",
  "Healthcare",
  "Retail",
  "Travel",
  "Software & IT",
  "Manufacturing",
  "Financial services",
  "Marketing agency",
];

export function toDetails(organization: OrganizationSummary): CompanyDetails {
  return {
    name: organization.name,
    industry: organization.industry ?? "",
    teamSize: organization.teamSize ?? "",
    phone: organization.phone ?? "",
    city: organization.city ?? "",
  };
}

/** The company logo, or its initials when there's none. */
export function CompanyLogo({ organization, size = 64 }: { organization: OrganizationSummary; size?: number }) {
  const { colors } = useTheme();
  const source = logoSource(organization);
  const box = { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.primarySoft };
  return source ? (
    <Image source={source} style={[styles.logo, box]} accessibilityLabel={`${organization.name} logo`} />
  ) : (
    <View style={[styles.logo, box]}>
      <AppText variant="heading" color={colors.primary}>
        {getInitials(organization.name)}
      </AppText>
    </View>
  );
}

export function LogoCard({ organization }: { organization: OrganizationSummary }) {
  const canEdit = useCanEdit();
  const upload = useUploadLogo();
  const remove = useRemoveLogo();

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    upload.mutate(asset.uri, { onError: (error) => Alert.alert("Couldn't upload the logo", getErrorMessage(error)) });
  }

  return (
    <Card>
      <AppText variant="heading">Logo</AppText>
      <View style={styles.logoRow}>
        <CompanyLogo organization={organization} />
        {canEdit && (
          <View style={styles.logoButtons}>
            <Button
              title={organization.logo ? "Change logo" : "Upload logo"}
              variant="secondary"
              icon="image-outline"
              loading={upload.isPending}
              onPress={() => void pick()}
            />
            {organization.logo && (
              <Button
                title="Remove"
                variant="ghost"
                loading={remove.isPending}
                onPress={() => remove.mutate(undefined, { onError: (error) => Alert.alert("Couldn't remove it", getErrorMessage(error)) })}
              />
            )}
          </View>
        )}
      </View>
      <AppText variant="small" muted>
        Pick a photo and crop it square; it&apos;s resized for you. Everyone on your team sees it.
      </AppText>
    </Card>
  );
}

export function DetailsCard({
  organization,
  submitLabel = "Save changes",
  onSaved,
}: {
  organization: OrganizationSummary;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const canEdit = useCanEdit();
  const update = useUpdateCompany();
  const saved = toDetails(organization);
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<CompanyDetails>) => setValues((v) => ({ ...v, ...patch }));
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function save() {
    if (!dirty) return onSaved?.();
    if (values.name.trim().length < 2) return setErrors({ name: "Company name is required" });
    update.mutate(
      { ...values, name: values.name.trim(), industry: values.industry.trim(), phone: values.phone.trim(), city: values.city.trim() },
      {
        onSuccess: () => {
          setErrors({});
          if (onSaved) onSaved();
          else Alert.alert("Company details saved");
        },
        onError: (error) => {
          if (error instanceof ApiClientError && error.errors) {
            setErrors(Object.fromEntries(error.errors.map((e) => [e.path, e.message])));
          } else Alert.alert("Couldn't save", getErrorMessage(error));
        },
      },
    );
  }

  const query = values.industry.trim().toLowerCase();
  const suggestions = INDUSTRY_SUGGESTIONS.filter((i) => i.toLowerCase() !== query && (!query || i.toLowerCase().includes(query))).slice(0, 5);

  return (
    <Card>
      <AppText variant="heading">Company details</AppText>
      <TextField label="Company name" value={values.name} onChangeText={(name) => set({ name })} error={errors.name} maxLength={120} editable={canEdit} />
      <TextField
        label="Industry"
        value={values.industry}
        onChangeText={(industry) => set({ industry })}
        placeholder="e.g. Real estate"
        error={errors.industry}
        maxLength={80}
        editable={canEdit}
      />
      {canEdit && suggestions.length > 0 && (
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} onPress={() => set({ industry: s })} />
          ))}
        </View>
      )}
      <View style={styles.group}>
        <AppText variant="label">Team size</AppText>
        <View style={styles.chips}>
          {TEAM_SIZES.map((size) => (
            <Chip
              key={size}
              label={size}
              selected={values.teamSize === size}
              disabled={!canEdit}
              onPress={() => set({ teamSize: values.teamSize === size ? "" : size })}
            />
          ))}
        </View>
      </View>
      <TextField label="Phone" value={values.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" maxLength={30} editable={canEdit} />
      <TextField label="City" value={values.city} onChangeText={(city) => set({ city })} maxLength={80} editable={canEdit} />
      {canEdit && <Button title={submitLabel} loading={update.isPending} disabled={!dirty && !onSaved} onPress={save} />}
    </Card>
  );
}

export function PlanLine({ organization }: { organization: OrganizationSummary }) {
  const status = organization.readOnly
    ? "Read-only"
    : organization.billingStatus === "trial" && organization.trialEndsAt
      ? `Free trial, ends ${formatDate(organization.trialEndsAt)}`
      : organization.paidUntil
        ? `Paid until ${formatDate(organization.paidUntil)}`
        : organization.billingStatus === "trial"
          ? "Free trial"
          : "Paid";
  return (
    <Card>
      <AppText variant="heading">Plan</AppText>
      <View style={styles.planRow}>
        <Badge label={planLabels[organization.plan] ?? organization.plan} color="indigo" />
        <AppText muted>{status}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  logoButtons: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  group: { gap: spacing.sm },
  planRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
