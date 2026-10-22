import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { ColorName } from "@/features/customization/types";
import { formatDate } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { projectStatusLabels, type Project, type ProjectProgress, type ProjectStatus } from "../types";

export const projectStatusColors: Record<ProjectStatus, ColorName> = {
  active: "sky",
  on_hold: "amber",
  completed: "emerald",
};

/** "4 of 10 tasks done · 2 overdue" with a bar. */
export function ProjectProgressView({ progress }: { progress: ProjectProgress }) {
  const { colors } = useTheme();
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  return (
    <View style={styles.progress}>
      <AppText variant="small" muted>
        {progress.done} of {progress.total} {progress.total === 1 ? "task" : "tasks"} done · {percent}%
        {progress.overdue > 0 ? (
          <AppText variant="small" color={colors.danger}>
            {" "}
            · {progress.overdue} overdue
          </AppText>
        ) : null}
      </AppText>
      <ProgressBar percent={percent} />
    </View>
  );
}

export function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View style={styles.title}>
        <AppText weight="600" style={styles.flex} numberOfLines={2}>
          {project.name}
        </AppText>
        <Badge label={projectStatusLabels[project.status]} color={projectStatusColors[project.status]} />
      </View>
      {project.clientName ? (
        <AppText variant="small" muted>
          {project.clientName}
        </AppText>
      ) : null}
      <ProjectProgressView progress={project.progress} />
      <AppText variant="small" muted>
        {[
          `${project.members.length} ${project.members.length === 1 ? "member" : "members"}`,
          project.manager && `Manager: ${project.manager.name}`,
          project.deadline && `Due ${formatDate(project.deadline)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  title: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  progress: { gap: spacing.xs },
});
