import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api-client";
import { useViewAsTarget } from "@/lib/view-as";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { formatClock, formatWorked } from "./format";
import { useCheckIn, useCheckOut, useEndBreak, useMyCheckIn, useStartBreak } from "./hooks";

/**
 * At the top of every screen for people who check in (same as the website):
 * a reminder with "Check in" until they do, then their time with Break and
 * Check out. Not shown to the owner or companies without check-ins.
 */
export function CheckInBar() {
  const { colors } = useTheme();
  const viewingAs = Boolean(useViewAsTarget());
  const { data } = useMyCheckIn();
  const checkIn = useCheckIn();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const checkOut = useCheckOut();
  const pending = checkIn.isPending || startBreak.isPending || endBreak.isPending || checkOut.isPending;

  if (viewingAs || !data?.required || !data.status || data.status === "checked_out") return null;
  const { status, record, shift, timeZone } = data;
  const onError = (title: string) => (error: unknown) => Alert.alert(title, getErrorMessage(error));
  const time = (value: string | null | undefined) => (value ? formatClock(value, timeZone) : "—");
  const notIn = status === "not_checked_in";
  const onBreak = status === "on_break";
  const tone = notIn ? colors.warning : onBreak ? colors.primary : colors.success;
  const background = notIn ? colors.warningSoft : onBreak ? colors.primarySoft : colors.successSoft;

  function confirmCheckOut() {
    Alert.alert("Check out for today?", "You can only check in once a day, so you can't check in again today.", [
      { text: "Cancel", style: "cancel" },
      { text: "Check out", onPress: () => checkOut.mutate(undefined, { onError: onError("Couldn't check out") }) },
    ]);
  }

  return (
    <View style={[styles.bar, { backgroundColor: background, borderColor: tone }]}>
      <View style={styles.text}>
        <Ionicons name={notIn ? "location-outline" : onBreak ? "cafe-outline" : "log-in-outline"} size={18} color={tone} />
        <AppText variant="small" style={styles.flex} color={tone} weight="600">
          {notIn
            ? `You haven't checked in today.${shift?.isWorkDay ? ` Shift ${shift.start}–${shift.end}.` : ""}`
            : onBreak
              ? `On a break since ${time(record?.breaks.find((b) => !b.endedAt)?.startedAt)}`
              : `Checked in at ${time(record?.checkInAt)}${record?.lateMinutes ? ` (${record.lateMinutes} min late)` : ""} · ${formatWorked(record?.workedMs ?? 0)}`}
        </AppText>
      </View>
      <View style={styles.buttons}>
        {notIn && (
          <Button
            title="Check in"
            icon="log-in-outline"
            loading={checkIn.isPending}
            disabled={pending}
            onPress={() =>
              checkIn.mutate({ locationRequired: data.rules?.locationRequired ?? true }, { onError: onError("Couldn't check in") })
            }
            style={styles.button}
          />
        )}
        {status === "working" && (data.rules?.breaks ?? true) && (
          <Button
            title="Start break"
            variant="secondary"
            icon="cafe-outline"
            disabled={pending}
            onPress={() => startBreak.mutate(undefined, { onError: onError("Couldn't start the break") })}
            style={styles.button}
          />
        )}
        {onBreak && (
          <Button
            title="End break"
            icon="play"
            disabled={pending}
            onPress={() => endBreak.mutate(undefined, { onError: onError("Couldn't end the break") })}
            style={styles.button}
          />
        )}
        {!notIn && (
          <Button title="Check out" variant="secondary" icon="log-out-outline" disabled={pending} loading={checkOut.isPending} onPress={confirmCheckOut} style={styles.button} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  text: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 40 },
});
