import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyView } from "@/components/ui/state-views";
import { useLeadOptions } from "@/features/customization/hooks";
import { monthName, Period, withTarget } from "@/features/dashboard/components/targets-card";
import {
  SCORE_PARTS,
  scoreColor,
  scorePartLabels,
  usePerformance,
  useTargets,
  type AgentPerformance,
  type ScoredAgent,
} from "@/features/performance/hooks";
import { addDays, formatDay, formatDuration, todayIn } from "@/features/tracking/format";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Owners and admins: every agent's results side by side, and their progress to targets. */
export default function PerformanceScreen() {
  const [tab, setTab] = useState<"report" | "targets">("report");
  return (
    <Screen>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: "report", label: "Report" },
          { value: "targets", label: "Targets" },
        ]}
      />
      {tab === "report" ? <ReportTab /> : <TargetsTab />}
    </Screen>
  );
}

// ---- Report ----

type Preset = "today" | "week" | "month" | "last_month" | "last_30" | "custom";
const PRESET_LABELS: Record<Preset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  last_month: "Last month",
  last_30: "Last 30 days",
  custom: "Custom",
};

/** `[from, to]` for a preset, as business days. Weeks start on Monday (same as the website). */
function rangeFor(preset: Exclude<Preset, "custom">, today: string) {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
      return { from: addDays(today, -((weekday + 6) % 7)), to: today };
    }
    case "month":
      return { from: monthStart, to: today };
    case "last_month": {
      const start = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
      return { from: start, to: addDays(monthStart, -1) };
    }
    case "last_30":
      return { from: addDays(today, -29), to: today };
  }
}

type SortKey = "score" | "won" | "wonValue" | "calls" | "messages" | "followUpsDone" | "leadsAssigned" | "activeMs";
const SORT_LABELS: Record<SortKey, string> = {
  score: "Score",
  won: "Won",
  wonValue: "Won value",
  calls: "Calls",
  messages: "Messages",
  followUpsDone: "Follow-ups",
  leadsAssigned: "New leads",
  activeMs: "Active time",
};

function dayToDate(day: string) {
  const [y, mo, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, mo - 1, d);
}
function dateToDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ReportTab() {
  const { tracking } = useLeadOptions();
  const today = todayIn(tracking.timeZone);
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState(() => rangeFor("month", today));
  const [sort, setSort] = useState<SortKey>("score");
  const range = preset === "custom" ? custom : rangeFor(preset, today);
  const report = usePerformance(range);
  const data = report.data;
  const rows: ScoredAgent[] = [...(data?.rows ?? [])].sort(
    (a, b) => b[sort] - a[sort] || b.won - a.won || a.user.name.localeCompare(b.user.name),
  );

  return (
    <>
      <View style={styles.chips}>
        {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
          <Chip
            key={key}
            label={PRESET_LABELS[key]}
            selected={preset === key}
            onPress={() => {
              if (key === "custom") setCustom(range);
              setPreset(key);
            }}
          />
        ))}
      </View>
      {preset === "custom" ? (
        <View style={styles.dates}>
          <View style={styles.flex}>
            <DateTimeField
              label="From"
              mode="date"
              value={dayToDate(custom.from)}
              onChange={(d) => {
                const from = dateToDay(d);
                setCustom((c) => ({ from, to: c.to < from ? from : c.to }));
              }}
            />
          </View>
          <View style={styles.flex}>
            <DateTimeField
              label="To"
              mode="date"
              value={dayToDate(custom.to)}
              minimumDate={dayToDate(custom.from)}
              onChange={(d) => setCustom((c) => ({ ...c, to: dateToDay(d) > today ? today : dateToDay(d) }))}
            />
          </View>
        </View>
      ) : (
        <AppText weight="600">
          {range.from === range.to ? formatDay(range.from) : `${formatDay(range.from, false)} – ${formatDay(range.to)}`}
        </AppText>
      )}

      <View style={styles.chips}>
        <AppText variant="small" muted style={styles.sortLabel}>
          Sort by
        </AppText>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <Chip key={key} label={SORT_LABELS[key]} selected={sort === key} onPress={() => setSort(key)} />
        ))}
      </View>

      {report.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : !data ? (
        <AppText muted>{getErrorMessage(report.error)}</AppText>
      ) : rows.length === 0 ? (
        <EmptyView icon="trophy-outline" title="No agents yet" message="Each agent's calls, follow-ups and deals show here as they work." />
      ) : (
        <View style={[styles.list, report.isPlaceholderData && styles.stale]}>
          {rows.map((row) => (
            <AgentCard key={row.user.id} row={row} weights={data.scoreWeights} />
          ))}
          {rows.length > 1 && (
            <Card>
              <AppText variant="heading">Team</AppText>
              <Metrics row={data.totals} />
            </Card>
          )}
        </View>
      )}
      <AppText variant="small" muted>
        Score (0–100) = activity against targets or the team average 40%, deals won 30%, follow-ups kept on time 20%,
        active time against the shift 10%. Tap an agent to see the parts. New leads = given to them in this period and
        still theirs (+ added themselves). Reached = connected or asked to call back. Open leads and overdue follow-ups
        are as of now.{data ? ` Days are counted in ${data.timeZone}.` : ""}
      </AppText>
    </>
  );
}

function AgentCard({ row, weights }: { row: ScoredAgent; weights: Record<(typeof SCORE_PARTS)[number], number> }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={styles.agentHeader}>
        <View style={styles.flex}>
          <AppText weight="600">
            {row.user.name}
            {!row.user.isActive ? <AppText variant="small" muted>{" (inactive)"}</AppText> : null}
          </AppText>
          <AppText
            variant="small"
            color={colors.primary}
            onPress={() => router.push({ pathname: "/monitoring/[userId]", params: { userId: row.user.id } })}
          >
            Open their day
          </AppText>
        </View>
        <Badge label={`Score ${row.score}`} color={scoreColor(row.score)} />
      </Pressable>
      {open && (
        <View style={[styles.parts, { borderColor: colors.border }]}>
          {SCORE_PARTS.map((part) => (
            <AppText key={part} variant="small" muted>
              {scorePartLabels[part]}: <AppText variant="small" weight="600">{row.scoreParts[part]}/100</AppText> (counts{" "}
              {weights[part]}%)
            </AppText>
          ))}
        </View>
      )}
      <Metrics row={row} />
    </Card>
  );
}

function Metrics({ row }: { row: Omit<AgentPerformance, "user"> }) {
  const { colors } = useTheme();
  const items: { label: string; value: string; danger?: boolean }[] = [
    { label: "New leads", value: `${row.leadsAssigned || "—"}${row.leadsCreated ? ` (+${row.leadsCreated} added)` : ""}` },
    { label: "Calls", value: row.calls ? `${row.calls} · ${row.callsReached} reached` : "—" },
    { label: "Talk time", value: row.talkSeconds ? formatDuration(row.talkSeconds * 1000) : "—" },
    { label: "Messages", value: String(row.messages || "—") },
    { label: "Follow-ups done", value: String(row.followUpsDone || "—") },
    { label: "Stage moves", value: String(row.stageMoves || "—") },
    { label: "Won", value: row.won ? `${row.won}${row.lost ? ` · ${row.lost} lost` : ""}` : row.lost ? `0 · ${row.lost} lost` : "—" },
    { label: "Won value", value: row.wonValue ? formatCurrency(row.wonValue) : "—" },
    { label: "Win rate", value: row.winRate === null ? "—" : `${row.winRate}%` },
    { label: "Active time", value: row.activeMs ? formatDuration(row.activeMs) : "—" },
    { label: "Open leads", value: String(row.openLeads || "—") },
    { label: "Overdue follow-ups", value: String(row.followUpsOverdue || "—"), danger: row.followUpsOverdue > 0 },
  ];
  return (
    <View style={styles.metrics}>
      {items.map((item) => (
        <View key={item.label} style={styles.metric}>
          <AppText variant="small" muted>
            {item.label}
          </AppText>
          <AppText weight="600" color={item.danger ? colors.danger : undefined}>
            {item.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ---- Targets ----

function TargetsTab() {
  const targets = useTargets();
  const data = targets.data;
  if (targets.isPending) return <AppText muted>Loading…</AppText>;
  if (!data) return <AppText muted>{getErrorMessage(targets.error)}</AppText>;
  if (!data.configured) {
    return (
      <EmptyView
        icon="flag-outline"
        title="No targets yet"
        message="Set daily and monthly targets for calls, follow-ups and deals in Settings. Agents see their progress on their dashboard."
      />
    );
  }
  return (
    <>
      <AppText variant="small" muted>
        Today ({formatDay(data.date)}) and {monthName(data.month)} so far.
      </AppText>
      {data.rows.map((row) => {
        const daily = withTarget(row.daily);
        const monthly = withTarget(row.monthly);
        return (
          <Card key={row.user.id}>
            <AppText
              variant="heading"
              onPress={() => router.push({ pathname: "/monitoring/[userId]", params: { userId: row.user.id } })}
            >
              {row.user.name}
            </AppText>
            {!row.hasTargets && <AppText muted>No targets for this agent.</AppText>}
            {daily.length > 0 && <Period title="Today" progress={row.daily} metrics={daily} />}
            {monthly.length > 0 && <Period title="This month" progress={row.monthly} metrics={monthly} />}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  sortLabel: { marginRight: spacing.xs },
  dates: { flexDirection: "row", gap: spacing.md },
  list: { gap: spacing.md },
  stale: { opacity: 0.6 },
  agentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  parts: { gap: 2, borderLeftWidth: 2, paddingLeft: spacing.sm, borderRadius: radius.sm },
  metrics: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  metric: { width: "50%", paddingRight: spacing.sm },
});
