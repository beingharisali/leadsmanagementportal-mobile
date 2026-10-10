import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { spacing } from "@/theme/colors";

interface OptionalDateFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** What an empty value means, e.g. "Empty = today" */
  hint: string;
}

/**
 * A day that may be left empty. The phone's picker always shows a day, so an
 * empty value is a button until one is picked, and a set one can be cleared.
 */
export function OptionalDateField({ label, value, onChange, hint }: OptionalDateFieldProps) {
  return (
    <View style={styles.wrapper}>
      {value ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <DateTimeField label={label} mode="date" value={value} onChange={onChange} />
          </View>
          <Button title="Clear" variant="ghost" onPress={() => onChange(null)} style={styles.clear} />
        </View>
      ) : (
        <>
          <AppText variant="label">{label}</AppText>
          <Button title="Pick a day" variant="secondary" icon="calendar-outline" onPress={() => onChange(new Date())} />
        </>
      )}
      <AppText variant="small" muted>
        {hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  flex: { flex: 1 },
  clear: { paddingHorizontal: spacing.md },
});
