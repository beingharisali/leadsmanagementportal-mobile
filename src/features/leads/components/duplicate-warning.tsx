import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useDuplicateCheck } from "../hooks";

/** Live warning while typing a phone or email that already belongs to another lead. */
export function DuplicateWarning({ phone, email, excludeId }: { phone: string; email: string; excludeId?: string }) {
  const { colors } = useTheme();
  const debouncedPhone = useDebouncedValue(phone.trim(), 500);
  const debouncedEmail = useDebouncedValue(email.trim().toLowerCase(), 500);
  const duplicates = useDuplicateCheck({ phone: debouncedPhone, email: debouncedEmail, excludeId }).data ?? [];
  if (duplicates.length === 0) return null;

  return (
    <Banner tone="warning" title="Possible duplicate" message="This phone or email already belongs to:">
      <View style={styles.list}>
        {duplicates.map((dup) => (
          <AppText
            key={dup.id}
            variant="small"
            onPress={() => router.push({ pathname: "/leads/[id]", params: { id: dup.id } })}
            accessibilityRole="link"
          >
            <AppText variant="small" weight="600" color={colors.primary}>
              {dup.businessName} · {dup.name}
            </AppText>
            <AppText variant="small" muted>
              {` · ${dup.assignedTo ? `assigned to ${dup.assignedTo.name}` : "unassigned"}`}
            </AppText>
          </AppText>
        ))}
      </View>
    </Banner>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
});
