import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { formatDue, isOverdue, partsDone, taskPriorityColors, taskStatusColors } from "../format";
import { taskPriorityLabels, taskStatusLabels, type Task } from "../types";

/** One task in a list: title, status, priority, due date, project and people. */
export function TaskRow({ task, onPress, onLongPress }: { task: Task; onPress: () => void; onLongPress?: () => void }) {
  const { colors } = useTheme();
  const overdue = isOverdue(task);
  const parts = partsDone(task);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={onLongPress ? "Long-press to move your part" : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: overdue ? colors.danger : colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <AppText weight="600" numberOfLines={2}>
        {task.title}
      </AppText>
      <View style={styles.badges}>
        <Badge label={taskStatusLabels[task.status]} color={taskStatusColors[task.status]} />
        <Badge label={taskPriorityLabels[task.priority]} color={taskPriorityColors[task.priority]} />
        {task.recurrence && <Ionicons name="repeat" size={14} color={colors.mutedText} />}
      </View>
      <View style={styles.meta}>
        <AppText variant="small" color={overdue ? colors.danger : undefined} muted={!overdue} weight={overdue ? "600" : undefined}>
          {task.dueAt ? `${overdue ? "Overdue · " : ""}${formatDue(task.dueAt)}` : "No due date"}
        </AppText>
        <AppText variant="small" muted numberOfLines={1} style={styles.flex}>
          {[
            task.project?.name,
            parts.total > 1 ? `${parts.done}/${parts.total} done` : task.assignees[0]?.user.name,
            task.myStatus ? "you're on it" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, textAlign: "right" },
  row: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs + 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
