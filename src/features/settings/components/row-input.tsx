import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { markInput } from "@/features/tracking/activity";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** A slim text input for editable list rows (stage names, sources…). Pass `accessibilityLabel`. */
export function RowInput({ style, onChangeText, ...props }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.mutedText}
      {...props}
      onChangeText={(text) => {
        markInput();
        onChangeText?.(text);
      }}
      style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm + 2, fontSize: 15 },
});
