import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { spacing } from "@/theme/colors";

interface CardHeaderProps {
  title: string;
  description?: string;
  /** A small link-style button on the right, e.g. "View all" */
  action?: { label: string; onPress: () => void };
}

/** Title, optional description and an action, at the top of a dashboard card. */
export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        {description && (
          <AppText variant="small" muted>
            {description}
          </AppText>
        )}
      </View>
      {action && <Button title={action.label} variant="ghost" onPress={action.onPress} style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  action: { minHeight: 32, paddingHorizontal: spacing.xs },
});
