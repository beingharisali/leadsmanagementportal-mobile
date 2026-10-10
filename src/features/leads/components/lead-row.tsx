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
  /** Selecting several leads: a tap toggles instead of opening the lead */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: (lead: Lead) => void;
  /** Starts selecting (managers) */
  onLongPress?: (lead: Lead) => void;
}

/** One lead in the list: business, contact, stage and rating. Tap to open. */
export const LeadRow = memo(function LeadRow({
  lead,
  showAssignee,
  selecting,
  selected,
  onToggle,
  onLongPress,
}: LeadRowProps) {
  const { colors } = useTheme();
  const contact = [lead.name, lead.city].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole={selecting ? "checkbox" : "button"}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${lead.businessName}, ${lead.name}`}
      onPress={() =>
        selecting ? onToggle?.(lead) : router.push({ pathname: "/leads/[id]", params: { id: lead.id } })
      }
      onLongPress={onLongPress ? () => onLongPress(lead) : undefined}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
        (pressed || selected) && { backgroundColor: colors.primarySoft },
      ]}
    >
      {selecting && (
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={selected ? colors.primary : colors.mutedText}
        />
      )}
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
      {!selecting && <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />}
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
