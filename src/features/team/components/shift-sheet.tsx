import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { useLeadOptions } from "@/features/customization/hooks";
import { useUpdateUser } from "@/features/users/hooks";
import { WEEKDAYS, type User, type UserShift } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Monday first, the way most work weeks are written. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "09:00" ↔ a Date today at that time, for the time picker. */
function toDate(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}
function toClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "9:00 am – 6:00 pm, Mon–Sat" style summary. */
export function formatShift(shift: UserShift) {
  const time = (clock: string) =>
    toDate(clock).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  const days = WEEK_ORDER.filter((d) => shift.workDays.includes(d)).map((d) => WEEKDAYS[d]);
  return `${time(shift.start)} – ${time(shift.end)}, ${days.join(" ") || "no days"}`;
}

interface ShiftSheetProps {
  user: User | null;
  onClose: () => void;
}

export function ShiftSheet(props: ShiftSheetProps) {
  return <ShiftSheetBody key={useOpenKey(!!props.user)} {...props} />;
}

/** Someone's own working hours, for timesheets, attendance and their productivity score. */
function ShiftSheetBody({ user, onClose }: ShiftSheetProps) {
  const { colors } = useTheme();
  const { tracking } = useLeadOptions();
  const company: UserShift = { start: tracking.shiftStart, end: tracking.shiftEnd, workDays: tracking.workDays };
  const update = useUpdateUser();
  const [custom, setCustom] = useState(Boolean(user?.shift));
  const [shift, setShift] = useState<UserShift>(user?.shift ?? company);
  const sameTimes = shift.start === shift.end;

  function save() {
    if (!user || (custom && sameTimes)) return;
    update.mutate(
      { id: user.id, payload: { shift: custom ? shift : null } },
      {
        onSuccess: onClose,
        onError: (error) => Alert.alert("Couldn't save the working hours", getErrorMessage(error)),
      },
    );
  }

  const toggleDay = (day: number) =>
    setShift((s) => ({
      ...s,
      workDays: s.workDays.includes(day) ? s.workDays.filter((d) => d !== day) : [...s.workDays, day].sort(),
    }));

  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={`Working hours${user ? ` for ${user.name}` : ""}`}
      subtitle="Late sign-ins, early leaves, attendance and the productivity score are measured against these hours."
      footer={<Button title="Save" loading={update.isPending} disabled={custom && sameTimes} onPress={save} />}
    >
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Own working hours</AppText>
          <AppText variant="small" muted>
            Off: the company shift, {formatShift(company)}.
          </AppText>
        </View>
        <Switch value={custom} onValueChange={setCustom} trackColor={{ true: colors.primary }} accessibilityLabel="Own working hours" />
      </View>

      {custom && (
        <>
          <View style={styles.times}>
            <View style={styles.flex}>
              <DateTimeField
                label="Starts"
                mode="time"
                value={toDate(shift.start)}
                onChange={(d) => setShift((s) => ({ ...s, start: toClock(d) }))}
              />
            </View>
            <View style={styles.flex}>
              <DateTimeField
                label="Ends"
                mode="time"
                value={toDate(shift.end)}
                onChange={(d) => setShift((s) => ({ ...s, end: toClock(d) }))}
                error={sameTimes ? "Must end at a different time" : undefined}
              />
            </View>
          </View>
          {shift.end < shift.start && !sameTimes && (
            <AppText variant="small" muted>
              Overnight shift: ends the next morning.
            </AppText>
          )}
          <View style={styles.group}>
            <AppText variant="label">Work days</AppText>
            <View style={styles.chips}>
              {WEEK_ORDER.map((day) => (
                <Chip key={day} label={WEEKDAYS[day] ?? ""} selected={shift.workDays.includes(day)} onPress={() => toggleDay(day)} />
              ))}
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  times: { flexDirection: "row", gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
