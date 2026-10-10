import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { PlatformOrganization } from "../hooks";

/** Active / trial over / payment overdue / suspended: what decides whether the company's users can sign in. */
export function OrganizationStatusBadge({
  organization,
}: {
  organization: Pick<PlatformOrganization, "status" | "readOnly" | "billingStatus" | "isDemo">;
}) {
  if (organization.isDemo) return <Badge label="Demo" color="sky" />;
  if (organization.status === "suspended") return <Badge label="Suspended" color="rose" />;
  if (organization.readOnly) return <Badge label={organization.billingStatus === "trial" ? "Trial ended" : "Payment overdue"} color="amber" />;
  return <Badge label="Active" color="emerald" />;
}

/** One company in a console list; tap to manage it. */
export function CompanyRow({ organization, detail }: { organization: PlatformOrganization; detail?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/console/companies/[id]", params: { id: organization.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={[styles.initials, { backgroundColor: colors.background }]}>
        <AppText variant="small" weight="700">
          {getInitials(organization.name)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText weight="600" numberOfLines={1}>
          {organization.name}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {organization.usage.activeUsers}/{organization.usage.users} users · {organization.usage.leads.toLocaleString()} leads
        </AppText>
        {detail}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  initials: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
