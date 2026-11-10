import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import {
  followUpTypeIcons,
  followUpTypeLabels,
  formatFollowUpDate,
  getFollowUpState,
} from "@/features/follow-ups/format";
import { formatDateTime, formatTimeAgo } from "@/lib/format";
import { accentColor, withAlpha } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { Lead, LeadCardInfo } from "../types";
import { RatingBadge, StageBadge } from "./lead-badges";

interface LeadRowProps {
  lead: Lead;
  /** Managers see who each lead belongs to */
  showAssignee?: boolean;
  /** Adds when the lead was given to its agent */
  showAssignedAt?: boolean;
  /** Selecting several leads: a tap toggles instead of opening the lead */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: (lead: Lead) => void;
  /** Starts selecting (managers) */
  onLongPress?: (lead: Lead) => void;
  /**
   * Pipeline only: pass the current time to show how old the assignment is,
   * plus the next follow-up and latest note from `cardInfo` when it has them.
   */
  now?: Date;
  cardInfo?: LeadCardInfo;
}

const STATE_COLORS = { overdue: "rose", today: "amber", upcoming: "sky" } as const;

/** "Today", "1 day old", "3 days old": whole calendar days since `at`, in local time. */
function formatAge(at: string, now: Date) {
  const start = new Date(at);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"} old`;
}

/** One lead in the list: business, contact, stage and rating. Tap to open. */
export const LeadRow = memo(function LeadRow({
  lead,
  showAssignee,
  showAssignedAt,
  selecting,
  selected,
  onToggle,
  onLongPress,
  now,
  cardInfo,
}: LeadRowProps) {
  const { colors, scheme } = useTheme();
  const next = now ? cardInfo?.nextFollowUp : null;
  const nextColor = next && now ? accentColor(STATE_COLORS[getFollowUpState(next.dueAt, now)], scheme) : null;
  const note = now ? cardInfo?.latestNote : null;
  const olderNotes = cardInfo ? cardInfo.noteCount - 1 : 0;
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
        {showAssignedAt && lead.assignedAt && (
          <AppText variant="small" muted numberOfLines={1}>
            Assigned {formatDateTime(lead.assignedAt)}
            {now ? (
              <AppText variant="small" weight="600">
                {` · ${formatAge(lead.assignedAt, now)}`}
              </AppText>
            ) : null}
          </AppText>
        )}
        {next && nextColor && now && cardInfo && (
          <View
            style={[
              styles.followUp,
              { backgroundColor: withAlpha(nextColor, 0.12), borderColor: withAlpha(nextColor, 0.35) },
            ]}
          >
            <Ionicons name={followUpTypeIcons[next.type]} size={13} color={nextColor} />
            <AppText variant="small" weight="600" color={nextColor} numberOfLines={1} style={styles.grow}>
              {followUpTypeLabels[next.type]} · {formatFollowUpDate(next.dueAt, now)}
            </AppText>
            {cardInfo.pendingFollowUps > 1 && (
              <AppText variant="small" weight="600" color={nextColor}>
                +{cardInfo.pendingFollowUps - 1} more
              </AppText>
            )}
          </View>
        )}
        {note && now && (
          <View style={[styles.note, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.noteBody}>
              <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.mutedText} style={styles.noteIcon} />
              <AppText variant="small" numberOfLines={2} style={styles.grow}>
                {note.message}
              </AppText>
            </View>
            <View style={styles.noteMeta}>
              <AppText variant="small" muted numberOfLines={1} style={styles.grow}>
                {note.author ? `${note.author} · ` : ""}
                {formatTimeAgo(note.createdAt, now)}
              </AppText>
              {olderNotes > 0 && (
                <AppText variant="small" muted weight="600">
                  +{olderNotes} more {olderNotes === 1 ? "remark" : "remarks"}
                </AppText>
              )}
            </View>
          </View>
        )}
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
  grow: { flexShrink: 1, flexGrow: 1 },
  followUp: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  note: { gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 1, borderWidth: 1, borderRadius: radius.md },
  noteBody: { flexDirection: "row", gap: spacing.xs + 1 },
  noteIcon: { marginTop: 2 },
  noteMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
