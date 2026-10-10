import { StyleSheet, View } from "react-native";

import type { ColorName } from "@/features/customization/types";
import { accentColor, withAlpha } from "@/theme/accents";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface BadgeProps {
  label: string;
  /** A company colour (stages, tags) */
  color?: ColorName;
  /** Or an exact colour */
  tint?: string;
  /** A dot before the label */
  dot?: boolean;
}

/** A small coloured pill: a lead's stage, rating, a follow-up's due state… */
export function Badge({ label, color = "slate", tint, dot }: BadgeProps) {
  const { scheme } = useTheme();
  const foreground = tint ?? accentColor(color, scheme);
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(foreground, 0.12), borderColor: withAlpha(foreground, 0.35) }]}>
      {dot && <View style={[styles.dot, { backgroundColor: foreground }]} />}
      <AppText variant="small" weight="600" color={foreground} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
});
