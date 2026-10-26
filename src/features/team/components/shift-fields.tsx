import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { WEEKDAYS, type UserShift } from "@/features/users/types";
import { spacing } from "@/theme/colors";

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

/** A shift that ends when it starts isn't one. */
export const isEmptyShift = (shift: UserShift) => shift.start === shift.end;

/** Start, end and work days of a shift: someone's own hours or a department's. */
export function ShiftFields({ shift, onChange }: { shift: UserShift; onChange: (shift: UserShift) => void }) {
  const sameTimes = isEmptyShift(shift);
  const toggleDay = (day: number) =>
    onChange({
      ...shift,
      workDays: shift.workDays.includes(day) ? shift.workDays.filter((d) => d !== day) : [...shift.workDays, day].sort(),
    });

  return (
    <>
      <View style={styles.times}>
        <View style={styles.flex}>
          <DateTimeField label="Starts" mode="time" value={toDate(shift.start)} onChange={(d) => onChange({ ...shift, start: toClock(d) })} />
        </View>
        <View style={styles.flex}>
          <DateTimeField
            label="Ends"
            mode="time"
            value={toDate(shift.end)}
            onChange={(d) => onChange({ ...shift, end: toClock(d) })}
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  times: { flexDirection: "row", gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
