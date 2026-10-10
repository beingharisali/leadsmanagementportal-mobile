import Ionicons from "@expo/vector-icons/Ionicons";
import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Password field with a show/hide button */
  password?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, password, style, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? "none" : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
          accessibilityLabel={label}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.mutedText} />
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.md },
});
