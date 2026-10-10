import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type Tone = "info" | "warning" | "danger" | "success";

const ICONS = {
  info: "information-circle-outline",
  warning: "warning-outline",
  danger: "alert-circle-outline",
  success: "checkmark-circle-outline",
} as const;

interface BannerProps {
  tone?: Tone;
  title?: string;
  message: string;
  /** e.g. a button */
  children?: ReactNode;
}

/** A coloured notice: read-only workspace, trial ending, offline… */
export function Banner({ tone = "info", title, message, children }: BannerProps) {
  const { colors } = useTheme();
  const { foreground, background } = {
    info: { foreground: colors.primary, background: colors.primarySoft },
    warning: { foreground: colors.warning, background: colors.warningSoft },
    danger: { foreground: colors.danger, background: colors.dangerSoft },
    success: { foreground: colors.success, background: colors.successSoft },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: background, borderColor: foreground }]} accessibilityRole="alert">
      <Ionicons name={ICONS[tone]} size={20} color={foreground} />
      <View style={styles.body}>
        {title && (
          <AppText variant="label" weight="600" color={foreground}>
            {title}
          </AppText>
        )}
        <AppText variant="small">{message}</AppText>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: spacing.xs },
});
