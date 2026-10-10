import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { addDays, formatDay, monthName, shiftMonth } from "../format";

function dayToDate(day: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}
function dateToDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ArrowButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: "chevron-back" | "chevron-forward";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.arrow,
        { borderColor: colors.border, backgroundColor: colors.card },
        (pressed || disabled) && { opacity: disabled ? 0.35 : 0.7 },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

/** ‹ Mon, 6 Oct 2026 › with a calendar on tap and "Today" when looking at another day. */
export function DayNav({ day, today, onChange, live }: { day: string; today: string; onChange: (day: string) => void; live?: boolean }) {
  const { colors, scheme } = useTheme();
  const [iosPicker, setIosPicker] = useState(false);

  function openPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: dayToDate(day),
        mode: "date",
        maximumDate: dayToDate(today),
        onValueChange: (_e, picked) => onChange(dateToDay(picked)),
      });
    } else setIosPicker((open) => !open);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <ArrowButton icon="chevron-back" label="Previous day" onPress={() => onChange(addDays(day, -1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Pick a day" onPress={openPicker} style={styles.label}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <AppText weight="600">{formatDay(day)}</AppText>
        </Pressable>
        <ArrowButton icon="chevron-forward" label="Next day" onPress={() => onChange(addDays(day, 1))} disabled={day >= today} />
      </View>
      {iosPicker && (
        <DateTimePicker
          value={dayToDate(day)}
          mode="date"
          display="inline"
          maximumDate={dayToDate(today)}
          themeVariant={scheme}
          accentColor={colors.primary}
          onValueChange={(_e, picked) => {
            onChange(dateToDay(picked));
            setIosPicker(false);
          }}
        />
      )}
      {day !== today ? (
        <Button title="Back to today" variant="ghost" onPress={() => onChange(today)} style={styles.small} />
      ) : live ? (
        <AppText variant="small" muted style={styles.center}>
          Live · updates every minute
        </AppText>
      ) : null}
    </View>
  );
}

/** ‹ October 2026 › */
export function MonthNav({ month, current, onChange }: { month: string; current: string; onChange: (month: string) => void }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <ArrowButton icon="chevron-back" label="Previous month" onPress={() => onChange(shiftMonth(month, -1))} />
        <View style={styles.label}>
          <AppText weight="600">{monthName(month)}</AppText>
        </View>
        <ArrowButton
          icon="chevron-forward"
          label="Next month"
          onPress={() => onChange(shiftMonth(month, 1))}
          disabled={month >= current}
        />
      </View>
      {month !== current && <Button title="This month" variant="ghost" onPress={() => onChange(current)} style={styles.small} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  arrow: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs + 2, minHeight: 40 },
  small: { minHeight: 32, alignSelf: "center" },
  center: { textAlign: "center" },
});
