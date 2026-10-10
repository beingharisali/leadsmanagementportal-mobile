import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useLeadOptions } from "@/features/customization/hooks";
import { formatDateTime } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { actionIcons, actionLabels, CONTENT_ACTIONS, formatChangeValue, formatFieldLabel } from "../format";
import type { Activity } from "../types";

/** One entry in a lead's history: who did what, when, and each field's old → new value. */
export function ActivityItem({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const lookups = useLeadOptions();
  // "Created" lists every initial value, which is noise; show only the key fields.
  const changes =
    activity.action === "created"
      ? activity.changes.filter((c) => ["status", "source", "assignedTo"].includes(c.field))
      : activity.changes;
  const boxed = CONTENT_ACTIONS.includes(activity.action);

  return (
    <View style={styles.item}>
      <View style={[styles.icon, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Ionicons name={actionIcons[activity.action]} size={15} color={colors.mutedText} />
      </View>
      <View style={styles.body}>
        <AppText variant="small">
          <AppText variant="small" weight="600">
            {activity.actor?.name ?? "Someone"}
          </AppText>{" "}
          <AppText variant="small" muted>
            {actionLabels[activity.action].toLowerCase()} · {formatDateTime(activity.createdAt)}
          </AppText>
        </AppText>

        {changes.map((change) => (
          <AppText key={change.field} variant="small">
            <AppText variant="small" muted>
              {formatFieldLabel(change.field, lookups)}:{" "}
            </AppText>
            {activity.action !== "created" && (
              <AppText variant="small" muted style={styles.strike}>
                {formatChangeValue(change.field, change.from, lookups)}
              </AppText>
            )}
            {activity.action !== "created" && " → "}
            <AppText variant="small" weight="600">
              {formatChangeValue(change.field, change.to, lookups)}
            </AppText>
          </AppText>
        ))}

        {activity.message ? (
          boxed ? (
            <View style={[styles.box, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <AppText variant="small">{activity.message}</AppText>
            </View>
          ) : (
            <AppText variant="small" muted>
              {activity.action === "status_changed" ? `Reason: ${activity.message}` : activity.message}
            </AppText>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: spacing.md },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: spacing.xs, paddingTop: 4 },
  strike: { textDecorationLine: "line-through" },
  box: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2 },
});
