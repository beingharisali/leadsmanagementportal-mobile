import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { formatClock, formatWorked, mapLink } from "@/features/check-ins/format";
import { useCheckInBoard } from "@/features/check-ins/hooks";
import { checkInStatusLabels, type CheckInLocation, type CheckInStatus } from "@/features/check-ins/types";
import type { ColorName } from "@/features/customization/types";
import { userRoleLabels } from "@/features/users/types";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const statusColors: Record<CheckInStatus, ColorName> = {
  not_checked_in: "slate",
  working: "emerald",
  on_break: "sky",
  checked_out: "indigo",
};

const shiftDay = (day: string, amount: number) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10);
};

/** The day's check-ins for owners and admins: status, times, breaks and locations. */
export default function CheckInsScreen() {
  const { colors } = useTheme();
  const [date, setDate] = useState("");
  const board = useCheckInBoard(date);

  if (board.isPending) return <LoadingView />;
  if (!board.data) return <ErrorView error={board.error} onRetry={() => void board.refetch()} />;
  const data = board.data;
  const tz = data.timeZone;
  const time = (value: string | null | undefined) => (value ? formatClock(value, tz) : "—");
  const openMap = (location: CheckInLocation | null | undefined) => location && void Linking.openURL(mapLink(location));

  return (
    <Screen onRefresh={() => board.refetch()}>
      <View style={styles.dayRow}>
        <Button title="Prev" icon="chevron-back" variant="ghost" onPress={() => setDate(shiftDay(data.date, -1))} style={styles.arrow} />
        <AppText variant="heading" style={styles.dayLabel}>
          {data.date === data.today ? "Today" : new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
        </AppText>
        <Button
          title="Next"
          icon="chevron-forward"
          variant="ghost"
          disabled={data.date >= data.today}
          onPress={() => setDate(shiftDay(data.date, 1))}
          style={styles.arrow}
        />
      </View>
      <AppText variant="small" muted>
        {data.summary.checkedIn} of {data.summary.expected} checked in · {data.summary.late} late · {data.summary.onBreak} on a break ·{" "}
        {data.summary.checkedOut} checked out
      </AppText>

      {data.rows.length === 0 ? (
        <EmptyView icon="location-outline" title="Nobody checks in yet" />
      ) : (
        data.rows.map(({ user, shift, status, record }) => (
          <Card key={user.id}>
            <View style={styles.head}>
              <View style={styles.flex}>
                <AppText weight="600">{user.name}</AppText>
                <AppText variant="small" muted>
                  {[userRoleLabels[user.role], user.department, shift.isWorkDay ? `${shift.start}–${shift.end}` : "Day off"]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </View>
              <Badge label={checkInStatusLabels[status]} color={statusColors[status]} />
            </View>
            {record && (
              <>
                <Pressable onPress={() => openMap(record.checkInLocation)} style={styles.line}>
                  <Ionicons name="log-in-outline" size={16} color={colors.mutedText} />
                  <AppText variant="small">
                    Checked in {time(record.checkInAt)}
                    {record.lateMinutes ? (
                      <AppText variant="small" color={colors.warning} weight="600">
                        {` · ${record.lateMinutes} min late`}
                      </AppText>
                    ) : null}
                  </AppText>
                  {record.checkInLocation && <Ionicons name="map-outline" size={14} color={colors.primary} />}
                </Pressable>
                {record.breaks.map((b, i) => (
                  <View key={i} style={styles.line}>
                    <Ionicons name="cafe-outline" size={16} color={colors.mutedText} />
                    <AppText variant="small">
                      Break {time(b.startedAt)} – {b.endedAt ? time(b.endedAt) : "now"}
                    </AppText>
                  </View>
                ))}
                <Pressable onPress={() => openMap(record.checkOutLocation)} style={styles.line}>
                  <Ionicons name="log-out-outline" size={16} color={colors.mutedText} />
                  <AppText variant="small" color={record.notCheckedOut ? colors.danger : undefined}>
                    {record.checkOutAt ? `Checked out ${time(record.checkOutAt)}` : record.notCheckedOut ? "Didn't check out" : "Not checked out yet"}
                  </AppText>
                  {record.checkOutLocation && <Ionicons name="map-outline" size={14} color={colors.primary} />}
                </Pressable>
                <AppText variant="small" weight="600">
                  Worked {formatWorked(record.workedMs)}
                </AppText>
              </>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dayRow: { flexDirection: "row", alignItems: "center" },
  dayLabel: { flex: 1, textAlign: "center" },
  arrow: { minHeight: 40, paddingHorizontal: spacing.sm },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
