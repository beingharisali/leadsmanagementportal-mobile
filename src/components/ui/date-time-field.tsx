import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface DateTimeFieldProps {
  label: string;
  /** `null`: nothing picked yet (date-only fields) */
  value: Date | null;
  onChange: (value: Date) => void;
  /** "datetime": a day and a time; "date": a calendar day only */
  mode?: "datetime" | "date";
  minimumDate?: Date;
  error?: string;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * The phone's own date and time pickers: a dialog on Android, compact
 * pickers that open a calendar / wheel on iPhone.
 */
export function DateTimeField({ label, value, onChange, mode = "datetime", minimumDate, error }: DateTimeFieldProps) {
  const { colors, scheme } = useTheme();
  const current = value ?? new Date();

  /** Keeps the other half (time or day) of the value when one half changes. */
  function merge(picked: Date, part: "date" | "time") {
    const next = new Date(current);
    if (part === "date") next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next);
  }

  function openAndroid(part: "date" | "time") {
    DateTimePickerAndroid.open({
      value: current,
      mode: part,
      minimumDate: part === "date" ? minimumDate : undefined,
      is24Hour: false,
      onValueChange: (_event, picked) => merge(picked, part),
    });
  }

  const box = [styles.box, { backgroundColor: colors.input, borderColor: error ? colors.danger : colors.border }];

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      {Platform.OS === "android" ? (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: pick a day`}
            onPress={() => openAndroid("date")}
            style={[box, styles.flex]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.mutedText} />
            <AppText muted={!value}>{value ? formatDay(value) : "Pick a day"}</AppText>
          </Pressable>
          {mode === "datetime" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}: pick a time`}
              onPress={() => openAndroid("time")}
              style={box}
            >
              <Ionicons name="time-outline" size={18} color={colors.mutedText} />
              <AppText>{formatClock(current)}</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.row}>
          <DateTimePicker
            value={current}
            mode={mode}
            display="compact"
            minimumDate={minimumDate}
            themeVariant={scheme}
            accentColor={colors.primary}
            onValueChange={(_event, picked) => onChange(picked)}
          />
        </View>
      )}
      {error && (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
});
