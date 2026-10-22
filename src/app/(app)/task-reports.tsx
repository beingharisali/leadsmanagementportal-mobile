import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useDepartmentName, useDepartments } from "@/features/departments/hooks";
import { useTaskAccess, useTaskReport } from "@/features/tasks/hooks";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "month", label: "This month" },
] as const;

function rangeOf(value: string) {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from =
    value === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - Number(value) + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** How each person is doing with their tasks. The owner sees everyone; department heads their people. */
export default function TaskReportsScreen() {
  const { colors } = useTheme();
  const access = useTaskAccess();
  const departments = useDepartments();
  const departmentName = useDepartmentName();
  const [range, setRange] = useState<string>("30");
  const [department, setDepartment] = useState<string | null>(null);
  const params = useMemo(() => ({ ...rangeOf(range), department: department ?? undefined }), [range, department]);
  const report = useTaskReport(params);
  const allowed = access.data?.isOwner ? departments.data : departments.data?.filter((d) => access.data?.headOf.includes(d.id));

  return (
    <Screen onRefresh={() => report.refetch()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RANGES.map((r) => (
          <Chip key={r.value} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={access.data?.isOwner ? "All departments" : "All mine"} selected={department === null} onPress={() => setDepartment(null)} />
        {(allowed ?? []).map((d) => (
          <Chip key={d.id} label={d.name} selected={department === d.id} onPress={() => setDepartment(d.id)} />
        ))}
      </ScrollView>
      {report.isPending ? (
        <LoadingView />
      ) : report.error ? (
        <ErrorView error={report.error} onRetry={() => void report.refetch()} />
      ) : !report.data || report.data.length === 0 ? (
        <EmptyView icon="bar-chart-outline" title="No tasks yet" message="Once people have tasks, their numbers show here." />
      ) : (
        <View style={styles.list}>
          {report.data.map((row) => (
            <Card key={row.user.id}>
              <AppText weight="600">{row.user.name}</AppText>
              <AppText variant="small" muted>
                {departmentName(row.user.department)}
              </AppText>
              <View style={styles.stats}>
                <Stat label="Given" value={String(row.assigned)} />
                <Stat label="Finished" value={String(row.completed)} />
                <Stat label="On time" value={row.onTimeRate === null ? "—" : `${row.onTimeRate}%`} />
                <Stat label="Open" value={String(row.open)} />
                <Stat label="Overdue" value={String(row.overdue)} color={row.overdue > 0 ? colors.danger : undefined} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="heading" color={color}>
        {value}
      </AppText>
      <AppText variant="small" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  list: { gap: spacing.sm + 2 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  stat: { minWidth: 56 },
});
