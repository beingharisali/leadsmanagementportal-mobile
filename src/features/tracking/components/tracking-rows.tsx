import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { endReasonLabels, formatDay, formatDuration, formatMinutes, formatTime, statusConfig } from "../format";
import type { PresenceStatus, Session, TimesheetRow } from "../types";

/** Coloured dot + label, so status never relies on colour alone. */
export function StatusDot({ status, detail }: { status: PresenceStatus; detail?: string }) {
  const config = statusConfig[status];
  return (
    <View style={styles.status}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <AppText variant="small" weight="600">
        {config.label}
      </AppText>
      {detail && (
        <AppText variant="small" muted>
          · {detail}
        </AppText>
      )}
    </View>
  );
}

const deviceIcons = { desktop: "laptop-outline", mobile: "phone-portrait-outline", tablet: "tablet-portrait-outline" } as const;

/** One sign-in: when, how long, from which device / browser / IP, and how it ended. */
export function SessionItem({ session, timeZone, showDate }: { session: Session; timeZone?: string; showDate?: boolean }) {
  const { colors } = useTheme();
  const end = session.endedAt ?? session.lastSeenAt;
  return (
    <View style={styles.session}>
      <Ionicons name={deviceIcons[session.device] ?? "laptop-outline"} size={18} color={colors.mutedText} style={styles.sessionIcon} />
      <View style={styles.flex}>
        <AppText variant="small" weight="600">
          {showDate ? `${formatDate(session.startedAt)} · ` : ""}
          {formatTime(session.startedAt, timeZone)} – {session.endedAt ? formatTime(session.endedAt, timeZone) : "now"}
          <AppText variant="small" muted>
            {` · ${formatDuration(new Date(end).getTime() - new Date(session.startedAt).getTime())}`}
          </AppText>
        </AppText>
        <AppText variant="small" muted>
          {session.browser} · {session.os} · {session.ip}
        </AppText>
        {session.endedAt ? (
          session.endReason && (
            <AppText variant="small" muted>
              {endReasonLabels[session.endReason]}
            </AppText>
          )
        ) : (
          <Badge label="Still signed in" color="emerald" />
        )}
      </View>
    </View>
  );
}

/**
 * A timesheet row as a card: `by="user"` (team, one day) names the person;
 * `by="date"` (one person, many days) names the day. Tap for their full day.
 */
export function TimesheetCard({ row, by, timeZone }: { row: TimesheetRow; by: "user" | "date"; timeZone: string }) {
  const { colors } = useTheme();
  // With check-ins the day is measured from them (the row then carries `checkInAt`).
  const checkIns = "checkInAt" in row;
  const absent = checkIns ? !row.checkInAt : row.loggedInMs === 0 && row.actions === 0;
  const dayOff = absent && !row.isWorkDay;
  const activeShare = row.loggedInMs > 0 ? Math.round((row.activeMs / row.loggedInMs) * 100) : null;
  const time = (value: string | null) => (value ? formatTime(value, timeZone) : "—");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/monitoring/[userId]", params: { userId: row.user.id, date: row.date } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        absent && styles.dim,
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={styles.cardHeader}>
        <AppText weight="600" style={styles.flex} numberOfLines={1}>
          {by === "user" ? row.user.name : formatDay(row.date, false)}
          {by === "user" && !row.user.isActive ? <AppText variant="small" muted>{" (inactive)"}</AppText> : null}
        </AppText>
        {dayOff ? (
          <Badge label="Day off" />
        ) : absent ? (
          <Badge label={row.isWorkDay ? (checkIns ? "Not checked in" : "Not signed in") : "—"} color={row.isWorkDay ? "rose" : "slate"} />
        ) : (
          <AppText weight="700">{formatDuration(row.activeMs)}</AppText>
        )}
      </View>
      {!absent && (
        <>
          {checkIns && (
            <AppText variant="small" weight="600">
              Checked in {time(row.checkInAt ?? null)} – {row.checkOutAt ? time(row.checkOutAt) : row.notCheckedOut ? "didn't check out" : "still in"} ·
              worked {formatDuration(row.checkedInMs ?? 0)}
              {row.breaks?.length ? ` · ${row.breaks.length} ${row.breaks.length === 1 ? "break" : "breaks"} (${formatDuration(row.breakMs ?? 0)})` : ""}
            </AppText>
          )}
          <AppText variant="small" muted>
            {time(row.firstLoginAt ?? row.firstSeenAt)} – {time(row.lastLogoutAt)} · logged in {formatDuration(row.loggedInMs)}
            {activeShare !== null ? ` · ${activeShare}% active` : ""}
          </AppText>
          <AppText variant="small" muted>
            Idle {formatDuration(row.idleMs)} · background {formatDuration(row.awayMs)} · {row.leadViews} leads opened ·{" "}
            {row.actions} actions
          </AppText>
          {(row.lateMinutes !== null || row.leftEarlyMinutes !== null) && (
            <View style={styles.flags}>
              {row.lateMinutes !== null && <Badge label={`${formatMinutes(row.lateMinutes)} late`} color="amber" />}
              {row.leftEarlyMinutes !== null && <Badge label={`Left ${formatMinutes(row.leftEarlyMinutes)} early`} color="amber" />}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  session: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  sessionIcon: { marginTop: 1 },
  card: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  dim: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
