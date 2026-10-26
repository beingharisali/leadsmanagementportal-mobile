import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useHasFeature } from "@/features/plans/hooks";
import { useUpdateUser, useWorkingHours } from "@/features/users/hooks";
import {
  DEFAULT_CHECK_IN_RULES,
  type CheckInRules,
  type User,
  type UserShift,
  type WorkingHours,
} from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { formatShift, isEmptyShift, ShiftFields } from "./shift-fields";

export { formatShift } from "./shift-fields";

interface ShiftSheetProps {
  user: User | null;
  onClose: () => void;
}

/**
 * Someone's own working hours (for timesheets, attendance and their
 * productivity score) and, with "Check-in & attendance", how they check in.
 */
export function ShiftSheet({ user, onClose }: ShiftSheetProps) {
  const key = useOpenKey(!!user);
  const hours = useWorkingHours(user?.id);
  const title = `Working hours${user ? ` for ${user.name}` : ""}`;

  if (!user || !hours.data) {
    return (
      <Sheet open={!!user} onClose={onClose} title={title}>
        {hours.isError ? <AppText muted>{getErrorMessage(hours.error)}</AppText> : <LoadingView />}
      </Sheet>
    );
  }
  return <ShiftSheetBody key={key} user={user} hours={hours.data} title={title} onClose={onClose} />;
}

/** What someone works without their own hours: their department's shift, or else the company's. */
function fallbackOf(hours: WorkingHours) {
  if (hours.department?.shift) return { label: `the ${hours.department.name} shift`, shift: hours.department.shift };
  return { label: "the company shift", shift: hours.company };
}

const sameRules = (a: CheckInRules, b: CheckInRules) => JSON.stringify(a) === JSON.stringify(b);

function ShiftSheetBody({ user, hours, title, onClose }: { user: User; hours: WorkingHours; title: string; onClose: () => void }) {
  const fallback = fallbackOf(hours);
  const showCheckIn = useHasFeature("checkIns") && hours.canCheckIn;
  const update = useUpdateUser();
  const [custom, setCustom] = useState(Boolean(hours.own));
  const [shift, setShift] = useState<UserShift>(hours.own ?? fallback.shift);
  const [rules, setRules] = useState<CheckInRules>(hours.checkInRules);
  const [grace, setGrace] = useState(String(hours.checkInRules.graceMinutes));
  const invalid = custom && isEmptyShift(shift);
  const set = <K extends keyof CheckInRules>(key: K, value: CheckInRules[K]) => setRules((r) => ({ ...r, [key]: value }));

  function save() {
    if (invalid) return;
    const graceMinutes = Math.min(240, Math.max(0, Math.round(Number(grace) || 0)));
    const nextRules = { ...rules, graceMinutes };
    update.mutate(
      {
        id: user.id,
        payload: {
          shift: custom ? shift : null,
          // The usual rules are saved as "none", so later changes to the defaults reach them.
          ...(showCheckIn && { checkInRules: sameRules(nextRules, DEFAULT_CHECK_IN_RULES) ? null : nextRules }),
        },
      },
      {
        onSuccess: onClose,
        onError: (error) => Alert.alert("Couldn't save the working hours", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      subtitle={`Late ${showCheckIn ? "check-ins" : "sign-ins"}, early leaves, attendance and the productivity score are measured against these hours.`}
      footer={<Button title="Save" loading={update.isPending} disabled={invalid} onPress={save} />}
    >
      <RuleSwitch
        label="Own working hours"
        description={`Off: ${fallback.label}, ${formatShift(fallback.shift)}.`}
        value={custom}
        onChange={setCustom}
      />
      {custom && <ShiftFields shift={shift} onChange={setShift} />}

      {showCheckIn && (
        <>
          <AppText variant="label" style={styles.section}>
            Check-in
          </AppText>
          <RuleSwitch
            label="Checks in"
            description="Off: they don't check in, and their days are measured from when they're signed in."
            value={rules.required}
            onChange={(v) => set("required", v)}
          />
          {rules.required && (
            <>
              <RuleSwitch
                label="Location required"
                description="Off: they can check in without sharing their location. It's still saved when the phone gives it."
                value={rules.locationRequired}
                onChange={(v) => set("locationRequired", v)}
              />
              <RuleSwitch
                label="Breaks"
                description="Off: no Start break button."
                value={rules.breaks}
                onChange={(v) => set("breaks", v)}
              />
              <RuleSwitch
                label="Late and missing alerts"
                description="Tell the owner and their department head when they check in late or haven't checked in."
                value={rules.alerts}
                onChange={(v) => set("alerts", v)}
              />
              <TextField
                label="Grace time (minutes)"
                value={grace}
                onChangeText={(text) => setGrace(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={3}
                hint="Checking in up to this long after the shift starts still counts as on time."
              />
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

function RuleSwitch({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="small" muted>
          {description}
        </AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  section: { marginTop: spacing.sm },
});
