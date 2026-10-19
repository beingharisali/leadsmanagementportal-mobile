import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { useLeadOptions } from "@/features/customization/hooks";
import { addDays, todayIn } from "@/features/tracking/format";
import { spacing } from "@/theme/colors";

export type AssignedPreset =
  "today" | "yesterday" | "last_7" | "last_30" | "custom";

/** When the lead was assigned. `assigned` "" means any date; the days are "YYYY-MM-DD". */
export interface AssignedFilter {
  assigned: AssignedPreset | "";
  assignedFrom: string;
  assignedUntil: string;
}

export const NO_ASSIGNED: AssignedFilter = {
  assigned: "",
  assignedFrom: "",
  assignedUntil: "",
};

export const assignedLabels: Record<AssignedPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  custom: "Pick dates",
};

/** The filter as the days to ask the API for. `today` is the company's today, the same day the server uses. */
export function assignedRangeFor(
  value: AssignedFilter,
  today: string,
): { assignedFrom?: string; assignedUntil?: string } {
  switch (value.assigned) {
    case "today":
      return { assignedFrom: today, assignedUntil: today };
    case "yesterday":
      return {
        assignedFrom: addDays(today, -1),
        assignedUntil: addDays(today, -1),
      };
    case "last_7":
      return { assignedFrom: addDays(today, -6), assignedUntil: today };
    case "last_30":
      return { assignedFrom: addDays(today, -29), assignedUntil: today };
    case "custom":
      return {
        assignedFrom: value.assignedFrom || undefined,
        assignedUntil: value.assignedUntil || undefined,
      };
    default:
      return {};
  }
}

/** Today in the company's time zone, "YYYY-MM-DD". */
export function useCompanyToday() {
  const { tracking } = useLeadOptions();
  return todayIn(tracking.timeZone);
}

/** "YYYY-MM-DD" ↔ the picker's Date, as a calendar day on the phone. */
function toDate(day: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function toDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Preset chips, plus from–to pickers for "Pick dates". Applies as you tap. */
export function AssignedDateSection({
  value,
  onChange,
}: {
  value: AssignedFilter;
  onChange: (value: AssignedFilter) => void;
}) {
  const today = useCompanyToday();

  function pick(preset: AssignedPreset) {
    if (value.assigned === preset) onChange(NO_ASSIGNED);
    // A new custom range starts as today, so the list doesn't jump to "everything"
    else if (preset === "custom")
      onChange({ assigned: preset, assignedFrom: today, assignedUntil: today });
    else onChange({ assigned: preset, assignedFrom: "", assignedUntil: "" });
  }

  return (
    <View style={styles.section}>
      <AppText variant="label">Assigned date</AppText>
      <View style={styles.chips}>
        {(Object.keys(assignedLabels) as AssignedPreset[]).map((preset) => (
          <Chip
            key={preset}
            label={assignedLabels[preset]}
            selected={value.assigned === preset}
            onPress={() => pick(preset)}
          />
        ))}
      </View>
      {value.assigned === "custom" && (
        <>
          <DateTimeField
            label="From"
            mode="date"
            value={value.assignedFrom ? toDate(value.assignedFrom) : null}
            onChange={(date) => {
              const day = toDay(date);
              // Keeps the range the right way round
              onChange({
                ...value,
                assignedFrom: day,
                assignedUntil:
                  value.assignedUntil < day ? day : value.assignedUntil,
              });
            }}
          />
          <DateTimeField
            label="To"
            mode="date"
            value={value.assignedUntil ? toDate(value.assignedUntil) : null}
            minimumDate={
              value.assignedFrom ? toDate(value.assignedFrom) : undefined
            }
            onChange={(date) =>
              onChange({ ...value, assignedUntil: toDay(date) })
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
