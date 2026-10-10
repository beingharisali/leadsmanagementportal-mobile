import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { markInput } from "@/features/tracking/activity";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.input, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.mutedText} />
      <TextInput
        value={value}
        onChangeText={(text) => {
          markInput();
          onChangeText(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.mutedText} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm },
});
