import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { memo } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, telUrl } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { followUpTypeIcons, followUpTypeLabels, formatFollowUpDate, formatFollowUpRelative, getFollowUpState } from "../format";
import type { FollowUp } from "../types";

const STATE_COLORS = { overdue: "rose", today: "amber", upcoming: "sky" } as const;

interface FollowUpRowProps {
  followUp: FollowUp;
  now: Date;
  /** Show whose it is (managers looking at the team's) */
  showAssignee?: boolean;
  /** Hide the lead's name (on the lead's own screen) */
  hideLead?: boolean;
  /** Pending only; omit to hide the buttons (read-only workspace) */
  onComplete?: (followUp: FollowUp) => void;
  onMore?: (followUp: FollowUp) => void;
}

/** A follow-up: what, with whom, when. Tap to open the lead. */
export const FollowUpRow = memo(function FollowUpRow({
  followUp,
  now,
  showAssignee,
  hideLead,
  onComplete,
  onMore,
}: FollowUpRowProps) {
  const { colors } = useTheme();
  const pending = followUp.status === "pending";
  const state = getFollowUpState(followUp.dueAt, now);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={hideLead}
      onPress={() => router.push({ pathname: "/leads/[id]", params: { id: followUp.lead.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={followUpTypeIcons[followUp.type]} size={18} color={colors.primary} />
      </View>

      <View style={styles.main}>
        {!hideLead && (
          <AppText weight="600" numberOfLines={1}>
            {followUp.lead.businessName}
          </AppText>
        )}
        <AppText variant="small" muted numberOfLines={1}>
          {followUpTypeLabels[followUp.type]}
          {hideLead ? "" : ` · ${followUp.lead.name}`}
          {pending ? ` · ${formatFollowUpDate(followUp.dueAt, now)}` : ""}
        </AppText>
        {pending ? (
          <Badge label={formatFollowUpRelative(followUp.dueAt, now)} color={STATE_COLORS[state]} />
        ) : (
          <AppText variant="small" muted>
            Done {followUp.completedAt ? formatDateTime(followUp.completedAt) : ""}
            {followUp.completedBy ? ` by ${followUp.completedBy.name}` : ""}
          </AppText>
        )}
        {followUp.note ? <AppText variant="small">{followUp.note}</AppText> : null}
        {followUp.location ? (
          <AppText variant="small" muted>
            Where: {followUp.location}
          </AppText>
        ) : null}
        {followUp.outcome ? <AppText variant="small">{followUp.outcome}</AppText> : null}
        {showAssignee && (
          <AppText variant="small" muted>
            {followUp.assignedTo?.name ?? "Unassigned lead"}
          </AppText>
        )}
      </View>

      {pending && (
        <View style={styles.actions}>
          {followUp.type === "call" && (
            <IconButton icon="call-outline" label="Call" onPress={() => void Linking.openURL(telUrl(followUp.lead.phone))} />
          )}
          {onComplete && <IconButton icon="checkmark" label="Mark as done" primary onPress={() => onComplete(followUp)} />}
          {onMore && <IconButton icon="ellipsis-horizontal" label="More" onPress={() => onMore(followUp)} />}
        </View>
      )}
    </Pressable>
  );
});

function IconButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: "call-outline" | "checkmark" | "ellipsis-horizontal";
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: primary ? colors.primary : colors.card,
          borderColor: primary ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name={icon} size={18} color={primary ? colors.primaryText : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  icon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  main: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.sm },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
