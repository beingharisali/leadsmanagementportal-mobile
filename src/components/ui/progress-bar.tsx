import { StyleSheet, View } from "react-native";

import { radius } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  color?: string;
  label?: string;
  height?: number;
}

/** A thin horizontal bar: share of leads in a stage, progress to a target… */
export function ProgressBar({ percent, color, label, height = 6 }: ProgressBarProps) {
  const { colors } = useTheme();
  const value = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={[styles.track, { backgroundColor: colors.border, height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
    >
      <View style={[styles.fill, { width: `${value}%`, backgroundColor: color ?? colors.primary, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden", borderRadius: radius.pill },
  fill: { height: "100%" },
});
