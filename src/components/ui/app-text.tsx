import { StyleSheet, Text, type TextProps } from "react-native";

import { useTheme } from "@/theme/use-theme";

type Variant = "title" | "heading" | "body" | "label" | "small";

interface AppTextProps extends TextProps {
  variant?: Variant;
  /** Secondary text: descriptions, timestamps */
  muted?: boolean;
  color?: string;
  weight?: "400" | "500" | "600" | "700";
}

/** Text in the app's type scale and the current theme's colours. */
export function AppText({ variant = "body", muted, color, weight, style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        styles[variant],
        { color: color ?? (muted ? colors.mutedText : colors.text) },
        weight && { fontWeight: weight },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700" },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  small: { fontSize: 13, lineHeight: 18 },
});
