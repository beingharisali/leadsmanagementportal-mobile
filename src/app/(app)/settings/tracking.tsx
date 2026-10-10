import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { OptionList } from "@/components/ui/option-list";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useUpdateTracking, useWorkspaceSettings } from "@/features/customization/hooks";
import type { TrackingSettings } from "@/features/customization/types";
import { WEEKDAYS } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

/** Monday first, the way most work weeks are written. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Common zones for when the phone can't list them all. */
const COMMON_ZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Kabul",
  "Asia/Tehran",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Europe/London",
  "Europe/Istanbul",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "Africa/Cairo",
  "UTC",
];

function timeZones(current: string) {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    // Not available on this phone: fall back to the common ones.
  }
  if (zones.length === 0) zones = COMMON_ZONES;
  return zones.includes(current) ? zones : [current, ...zones];
}

function toDate(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}
function toClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Owners and admins: idle time, auto sign-out, the business time zone and shift hours. */
export default function TrackingSettingsScreen() {
  const settings = useWorkspaceSettings().data;
  return (
    <Screen>
      <AppText muted>
        When someone counts as idle, when they&apos;re signed out, and the working hours timesheets are measured against.
      </AppText>
      {settings ? <TrackingForm key={JSON.stringify(settings.tracking)} saved={settings.tracking} /> : <AppText muted>Loading…</AppText>}
    </Screen>
  );
}

function TrackingForm({ saved }: { saved: TrackingSettings }) {
  const update = useUpdateTracking();
  const [values, setValues] = useState(saved);
  const [idle, setIdle] = useState(String(saved.idleAfterMinutes));
  const [logout, setLogout] = useState(String(saved.autoLogoutMinutes));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zonePicker, setZonePicker] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const set = (patch: Partial<TrackingSettings>) => setValues((v) => ({ ...v, ...patch }));

  const current = { ...values, idleAfterMinutes: Number(idle) || 0, autoLogoutMinutes: Number(logout) || 0 };
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);
  const overnight = values.shiftEnd <= values.shiftStart;
  const zones = timeZones(saved.timeZone).filter((z) => !zoneSearch || z.toLowerCase().includes(zoneSearch.toLowerCase()));

  function save() {
    const next: Record<string, string> = {};
    if (!Number.isInteger(current.idleAfterMinutes) || current.idleAfterMinutes < 1 || current.idleAfterMinutes > 120) {
      next.idleAfterMinutes = "Between 1 and 120 minutes";
    }
    if (!Number.isInteger(current.autoLogoutMinutes) || current.autoLogoutMinutes < 5 || current.autoLogoutMinutes > 1440) {
      next.autoLogoutMinutes = "Between 5 minutes and 24 hours (1440)";
    } else if (current.autoLogoutMinutes <= current.idleAfterMinutes) {
      next.autoLogoutMinutes = "Must be longer than the idle time";
    }
    if (values.shiftStart === values.shiftEnd) next.shiftEnd = "Must end at a different time";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    update.mutate(current, {
      onSuccess: () => Alert.alert("Tracking settings saved"),
      onError: (error) => {
        if (error instanceof ApiClientError && error.errors) {
          setErrors(Object.fromEntries(error.errors.map((e) => [e.path.replace(/^body\./, ""), e.message])));
        }
        Alert.alert("Couldn't save", getErrorMessage(error));
      },
    });
  }

  return (
    <>
      <Card>
        <TextField
          label="Mark as idle after (minutes)"
          value={idle}
          onChangeText={setIdle}
          keyboardType="number-pad"
          error={errors.idleAfterMinutes}
          hint="No touch, typing, mouse or keyboard for this long counts as idle time."
        />
        <TextField
          label="Sign out automatically after (minutes)"
          value={logout}
          onChangeText={setLogout}
          keyboardType="number-pad"
          error={errors.autoLogoutMinutes}
          hint="People get a warning two minutes before."
        />
      </Card>
      <Card>
        <AppText variant="label">Time zone</AppText>
        <View style={styles.zoneRow}>
          <AppText weight="600" style={styles.flex}>
            {values.timeZone.replace(/_/g, " ")}
          </AppText>
          <Button title="Change" variant="ghost" onPress={() => setZonePicker(true)} style={styles.inline} />
        </View>
        {errors.timeZone ? <AppText variant="small">{errors.timeZone}</AppText> : null}
        <AppText variant="small" muted>
          Decides when a day starts and ends in timesheets and reports. Changing it applies to new activity; past days keep
          their dates.
        </AppText>
      </Card>
      <Card>
        <View style={styles.times}>
          <View style={styles.flex}>
            <DateTimeField label="Shift starts" mode="time" value={toDate(values.shiftStart)} onChange={(d) => set({ shiftStart: toClock(d) })} />
          </View>
          <View style={styles.flex}>
            <DateTimeField
              label="Shift ends"
              mode="time"
              value={toDate(values.shiftEnd)}
              onChange={(d) => set({ shiftEnd: toClock(d) })}
              error={errors.shiftEnd}
            />
          </View>
        </View>
        {overnight && values.shiftStart !== values.shiftEnd && (
          <AppText variant="small" muted>
            Overnight shift: late arrivals and early leaves aren&apos;t flagged.
          </AppText>
        )}
        <AppText variant="label">Work days</AppText>
        <View style={styles.chips}>
          {WEEK_ORDER.map((day) => {
            const on = values.workDays.includes(day);
            return (
              <Chip
                key={day}
                label={WEEKDAYS[day] ?? ""}
                selected={on}
                onPress={() =>
                  set({ workDays: on ? values.workDays.filter((d) => d !== day) : [...values.workDays, day].sort((a, b) => a - b) })
                }
              />
            );
          })}
        </View>
      </Card>
      <View style={styles.buttons}>
        <Button
          title="Undo"
          variant="ghost"
          disabled={!dirty}
          onPress={() => {
            setValues(saved);
            setIdle(String(saved.idleAfterMinutes));
            setLogout(String(saved.autoLogoutMinutes));
            setErrors({});
          }}
        />
        <Button title="Save" loading={update.isPending} disabled={!dirty} onPress={save} style={styles.flex} />
      </View>

      <Sheet open={zonePicker} onClose={() => setZonePicker(false)} title="Time zone">
        <SearchField value={zoneSearch} onChangeText={setZoneSearch} placeholder="Search, e.g. Karachi" />
        <OptionList
          options={zones.slice(0, 80).map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
          value={values.timeZone}
          onSelect={(timeZone) => {
            set({ timeZone });
            setZonePicker(false);
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { minHeight: 32, paddingHorizontal: 0 },
  zoneRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  times: { flexDirection: "row", gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
