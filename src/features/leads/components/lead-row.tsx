import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatTimeAgo } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { Lead } from "../types";
import { RatingBadge, StageBadge } from "./lead-badges";

interface LeadRowProps {
  lead: Lead;
  /** Managers see who each lead belongs to */
  showAssignee?: boolean;
}

/** One lead in the list: business, contact, stage and rating. Tap to open. */
export const LeadRow = memo(function LeadRow({ lead, showAssignee }: LeadRowProps) {
  const { colors } = useTheme();
  const contact = [lead.name, lead.city].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lead.businessName}, ${lead.name}`}
      onPress={() => router.push({ pathname: "/leads/[id]", params: { id: lead.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={styles.main}>
        <AppText weight="600" numberOfLines={1}>
          {lead.businessName}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {contact}
        </AppText>
        <View style={styles.badges}>
          <StageBadge status={lead.status} />
          <RatingBadge rating={lead.rating} />
        </View>
        <AppText variant="small" muted numberOfLines={1}>
          {showAssignee && `${lead.assignedTo?.name ?? "Unassigned"} · `}
          {lead.lastContactedAt ? `Contacted ${formatTimeAgo(lead.lastContactedAt)}` : "Not contacted yet"}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  main: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
