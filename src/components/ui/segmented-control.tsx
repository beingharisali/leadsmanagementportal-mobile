import { Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface Segment<T extends string> {
  value: T;
  label: string;
  /** Shown after the label, e.g. a count */
  count?: number;
  /** Highlights the count (e.g. overdue) */
  urgent?: boolean;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Tabs inside a screen: Overdue / Today / Upcoming / Done… */
export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.border }]} accessibilityRole="tablist">
      {segments.map((segment) => {
        const selected = segment.value === value;
        const countColor = segment.urgent ? colors.danger : selected ? colors.primary : colors.mutedText;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, selected && [styles.selected, { backgroundColor: colors.card }]]}
          >
            <AppText variant="small" weight={selected ? "600" : "500"} numberOfLines={1} muted={!selected}>
              {segment.label}
              {segment.count ? (
                <AppText variant="small" weight="700" color={countColor}>
                  {` ${segment.count}`}
                </AppText>
              ) : null}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md - 2,
    paddingHorizontal: spacing.xs,
  },
  selected: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
