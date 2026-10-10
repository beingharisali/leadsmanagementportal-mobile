import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyView } from "@/components/ui/state-views";
import { useLeadOptions } from "@/features/customization/hooks";
import { DayNav, MonthNav } from "@/features/tracking/components/period-nav";
import { TimesheetCard } from "@/features/tracking/components/tracking-rows";
import { formatDuration, formatMinutes, formatShift, todayIn } from "@/features/tracking/format";
import { useAttendance, useTimesheet } from "@/features/tracking/hooks";
import type { AttendanceDay, AttendanceStatus } from "@/features/tracking/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Owners and admins: every agent's hours for a day, or a month of attendance. */
export default function TimesheetsScreen() {
  const [tab, setTab] = useState<"daily" | "attendance">("daily");
  return (
    <Screen>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: "daily", label: "Daily" },
          { value: "attendance", label: "Attendance" },
        ]}
      />
      {tab === "daily" ? <DailyTab /> : <AttendanceTab />}
    </Screen>
  );
}

function DailyTab() {
  const { tracking } = useLeadOptions();
  const [date, setDate] = useState(() => todayIn(tracking.timeZone));
  const sheet = useTimesheet({ from: date, to: date });
  const data = sheet.data;
  const today = data?.today ?? todayIn(tracking.timeZone);
  const rows = [...(data?.rows ?? [])].sort((a, b) => b.activeMs - a.activeMs || a.user.name.localeCompare(b.user.name));
  const total = rows.reduce(
    (sum, r) => ({ loggedIn: sum.loggedIn + r.loggedInMs, active: sum.active + r.activeMs }),
    { loggedIn: 0, active: 0 },
  );

  return (
    <>
      <DayNav day={date} today={today} onChange={setDate} />
      {sheet.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : !data ? (
        <AppText muted>{getErrorMessage(sheet.error)}</AppText>
      ) : rows.length === 0 ? (
        <EmptyView icon="time-outline" title="No agents yet" message="Timesheets fill in automatically as your agents work." />
      ) : (
        <View style={[styles.list, sheet.isPlaceholderData && styles.stale]}>
          {rows.length > 1 && (
            <AppText variant="small" muted>
              Team: {formatDuration(total.active)} active of {formatDuration(total.loggedIn)} logged in
              {total.loggedIn > 0 ? ` (${Math.round((total.active / total.loggedIn) * 100)}%)` : ""}
            </AppText>
          )}
          {rows.map((row) => (
            <TimesheetCard key={row.user.id} row={row} by="user" timeZone={data.timeZone} />
          ))}
        </View>
      )}
      <AppText variant="small" muted>
        Active = the app or portal open with recent touches or typing. Idle = open but no input for{" "}
        {tracking.idleAfterMinutes} min. Background = open but not on screen.
        {data ? ` Shift: ${formatShift(data.shift)} (${data.timeZone}).` : ""} Tap someone for their full day.
      </AppText>
    </>
  );
}

const STATUS: Record<AttendanceStatus, { label: string; short: string; color: "emerald" | "amber" | "rose" | "slate" | null }> = {
  present: { label: "Present", short: "P", color: "emerald" },
  late: { label: "Late", short: "L", color: "amber" },
  absent: { label: "Absent", short: "A", color: "rose" },
  day_off: { label: "Day off", short: "", color: "slate" },
  upcoming: { label: "Not yet", short: "", color: null },
};

const CELL_COLORS = {
  emerald: { bg: "#10B98126", fg: "#059669" },
  amber: { bg: "#F59E0B33", fg: "#B45309" },
  rose: { bg: "#F43F5E26", fg: "#E11D48" },
  slate: { bg: "#94A3B826", fg: "#64748B" },
} as const;

function dayDescription(day: AttendanceDay) {
  const parts = [STATUS[day.status].label];
  if (day.loggedInMs > 0) parts.push(`signed in ${formatDuration(day.loggedInMs)}`);
  if (day.lateMinutes) parts.push(`${formatMinutes(day.lateMinutes)} late`);
  if (day.leftEarlyMinutes) parts.push(`left ${formatMinutes(day.leftEarlyMinutes)} early`);
  return parts.join(" · ");
}

function AttendanceTab() {
  const { colors } = useTheme();
  const { tracking } = useLeadOptions();
  const thisMonth = todayIn(tracking.timeZone).slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [picked, setPicked] = useState<{ user: string; day: AttendanceDay } | null>(null);
  const attendance = useAttendance({ month });
  const data = attendance.data;

  return (
    <>
      <MonthNav month={month} current={thisMonth} onChange={setMonth} />
      {attendance.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : !data ? (
        <AppText muted>{getErrorMessage(attendance.error)}</AppText>
      ) : data.rows.length === 0 ? (
        <EmptyView icon="calendar-outline" title="No agents yet" message="Attendance fills in automatically as your agents sign in." />
      ) : (
        <View style={[styles.list, attendance.isPlaceholderData && styles.stale]}>
          {data.rows.map((row) => (
            <Card key={row.user.id}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/monitoring/[userId]", params: { userId: row.user.id } })}
              >
                <AppText weight="600">{row.user.name}</AppText>
                {row.shift.custom && (
                  <AppText variant="small" muted>
                    Own shift: {formatShift(row.shift)}
                  </AppText>
                )}
              </Pressable>
              <View style={styles.grid}>
                {row.days.map((day) => {
                  const status = STATUS[day.status];
                  const palette = status.color ? CELL_COLORS[status.color] : null;
                  const isToday = day.date === data.today;
                  return (
                    <Pressable
                      key={day.date}
                      accessibilityRole="button"
                      accessibilityLabel={`${day.date}: ${dayDescription(day)}`}
                      onPress={() => setPicked({ user: row.user.name, day })}
                      style={[
                        styles.cell,
                        { backgroundColor: palette?.bg ?? "transparent", borderColor: isToday ? colors.primary : colors.border },
                      ]}
                    >
                      <AppText style={styles.cellDate} muted>
                        {Number(day.date.slice(8))}
                      </AppText>
                      <AppText style={styles.cellText} weight="700" color={palette?.fg}>
                        {status.short}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="small" muted>
                Present {row.summary.present}/{row.summary.workDays} · late {row.summary.late} · absent{" "}
                <AppText variant="small" weight={row.summary.absent > 0 ? "700" : undefined} color={row.summary.absent > 0 ? colors.danger : undefined}>
                  {row.summary.absent}
                </AppText>{" "}
                · left early {row.summary.leftEarly}
              </AppText>
              {picked && picked.user === row.user.name && (
                <AppText variant="small">
                  {picked.day.date}: {dayDescription(picked.day)}
                </AppText>
              )}
            </Card>
          ))}
        </View>
      )}
      <View style={styles.legend}>
        {(["present", "late", "absent", "day_off"] as const).map((status) => {
          const palette = CELL_COLORS[STATUS[status].color!];
          return (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: palette.bg }]}>
                <AppText style={styles.cellText} weight="700" color={palette.fg}>
                  {STATUS[status].short}
                </AppText>
              </View>
              <AppText variant="small" muted>
                {STATUS[status].label}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="small" muted>
        Tap a day for details. Present counts work days that have ended. Each agent is measured against their own shift if
        they have one, else the company&apos;s{data ? ` (${formatShift(data.shift)})` : ""}.
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  stale: { opacity: 0.6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: { width: 38, height: 38, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  cellDate: { fontSize: 9, lineHeight: 11 },
  cellText: { fontSize: 12, lineHeight: 14 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendSwatch: { width: 20, height: 20, borderRadius: 4, alignItems: "center", justifyContent: "center" },
});
