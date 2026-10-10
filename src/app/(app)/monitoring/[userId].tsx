import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { ActivityItem } from "@/features/activities/components/activity-item";
import { useLeadOptions } from "@/features/customization/hooks";
import { DayTimeline } from "@/features/tracking/components/day-timeline";
import { DayNav } from "@/features/tracking/components/period-nav";
import { SessionItem, TimesheetCard } from "@/features/tracking/components/tracking-rows";
import { addDays, formatDuration, formatMinutes, formatTime, todayIn } from "@/features/tracking/format";
import { useAgentDay, useSessions, useTimesheet } from "@/features/tracking/hooks";
import type { AgentDay } from "@/features/tracking/types";
import { useViewAsControls } from "@/features/tracking/view-as";
import { userRoleLabels } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type Tab = "day" | "timesheet" | "logins";

/** Owners and admins: one person's day, timesheet and login history, plus "View as agent". */
export default function AgentScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ userId: string; date?: string }>();
  const userId = params.userId;
  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState<string | undefined>(params.date);
  const [knownToday, setKnownToday] = useState<string>();
  const isToday = !date || date === knownToday;
  const day = useAgentDay(userId, date, isToday);
  const data = day.data;
  if (data && data.today !== knownToday) setKnownToday(data.today);
  const viewAs = useViewAsControls();

  if (!data && day.isPending) return <LoadingView />;
  if (!data) {
    const notFound = day.error instanceof ApiClientError && day.error.status === 404;
    return notFound ? (
      <EmptyView icon="search-outline" title="Person not found" />
    ) : (
      <ErrorView error={day.error} onRetry={() => void day.refetch()} />
    );
  }

  const user = data.user;

  return (
    <Screen onRefresh={() => day.refetch()}>
      <Stack.Screen options={{ title: user.name }} />
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="heading" color={colors.primary}>
            {getInitials(user.name)}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{user.name}</AppText>
          <AppText variant="small" muted>
            {userRoleLabels[user.role]} · {user.email}
          </AppText>
          {!user.isActive && <Badge label="Inactive" />}
        </View>
      </View>
      {user.role === "agent" && user.isActive && (
        <Button
          title="View as agent"
          variant="secondary"
          icon="eye-outline"
          onPress={() => void viewAs.start({ id: user.id, name: user.name })}
        />
      )}

      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: "day", label: "Day" },
          { value: "timesheet", label: "Timesheet" },
          { value: "logins", label: "Logins" },
        ]}
      />

      {tab === "day" && <DayTab data={data} onDate={setDate} stale={day.isPlaceholderData} isToday={isToday} />}
      {tab === "timesheet" && <TimesheetTab userId={userId} today={data.today} />}
      {tab === "logins" && <LoginsTab userId={userId} timeZone={data.timeZone} />}
    </Screen>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText variant="small" muted>
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
      {hint ? (
        <AppText variant="small" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

function DayTab({
  data,
  onDate,
  stale,
  isToday,
}: {
  data: AgentDay;
  onDate: (date: string) => void;
  stale: boolean;
  isToday: boolean;
}) {
  const { summary, timeZone } = data;
  const { idleAfterMinutes } = useLeadOptions().tracking;
  const time = (value: string | null) => (value ? formatTime(value, timeZone) : "—");
  const share = (ms: number) =>
    summary.loggedInMs > 0 ? `${Math.round((ms / summary.loggedInMs) * 100)}% of logged-in time` : undefined;

  return (
    <View style={[styles.section, stale && styles.stale]}>
      <DayNav day={data.date} today={data.today} onChange={onDate} live={isToday} />

      <View style={styles.stats}>
        <Stat
          label="First login"
          value={time(summary.firstLoginAt ?? summary.firstSeenAt)}
          hint={
            summary.lateMinutes !== null
              ? `${formatMinutes(summary.lateMinutes)} after the shift started (${data.shift.start})`
              : !summary.firstLoginAt && summary.firstSeenAt
                ? "Carried over from the day before"
                : undefined
          }
        />
        <Stat
          label="Last logout"
          value={summary.signedInNow && data.date === data.today ? "Signed in" : time(summary.lastLogoutAt)}
          hint={
            summary.leftEarlyMinutes !== null
              ? `${formatMinutes(summary.leftEarlyMinutes)} before the shift ended (${data.shift.end})`
              : summary.lastSeenAt
                ? `Last activity ${time(summary.lastSeenAt)}`
                : undefined
          }
        />
        <Stat label="Logged in" value={formatDuration(summary.loggedInMs)} />
        <Stat label="Active" value={formatDuration(summary.activeMs)} hint={share(summary.activeMs)} />
        <Stat label="Idle" value={formatDuration(summary.idleMs)} hint={`No input for ${idleAfterMinutes}+ min`} />
        <Stat label="In the background" value={formatDuration(summary.awayMs)} hint="Not counted as active" />
        <Stat
          label="Leads opened"
          value={summary.leadsViewed}
          hint={summary.leadViews > summary.leadsViewed ? `${summary.leadViews} opens in total` : undefined}
        />
        <Stat label="Actions" value={summary.actions} hint="Edits, notes, stage changes…" />
      </View>

      <Card>
        <AppText variant="heading">Timeline</AppText>
        <AppText variant="small" muted>
          When they were active, idle or had the app / portal in the background ({timeZone} time).
        </AppText>
        <DayTimeline segments={data.timeline} timeZone={timeZone} />
      </Card>

      <Card>
        <AppText variant="heading">Time per lead</AppText>
        {data.leads.length === 0 ? (
          <AppText muted>No leads opened.</AppText>
        ) : (
          data.leads.map((row) => (
            <View key={row.lead.id} style={styles.leadRow}>
              <AppText
                style={styles.flex}
                numberOfLines={1}
                muted={row.lead.isDeleted}
                onPress={
                  row.lead.isDeleted ? undefined : () => router.push({ pathname: "/leads/[id]", params: { id: row.lead.id } })
                }
              >
                {row.lead.label}
                {row.lead.isDeleted ? " (deleted)" : ""}
              </AppText>
              <View style={styles.right}>
                <AppText weight="600">{formatDuration(row.activeMs)}</AppText>
                <AppText variant="small" muted>
                  {row.idleMs > 0 ? `${formatDuration(row.idleMs)} idle · ` : ""}
                  {row.views > 0 ? `${row.views}×` : ""}
                  {row.lastViewedAt ? ` last ${formatTime(row.lastViewedAt, timeZone)}` : ""}
                </AppText>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <AppText variant="heading">Sign-ins</AppText>
        {data.sessions.length === 0 ? (
          <AppText muted>Didn&apos;t sign in.</AppText>
        ) : (
          data.sessions.map((session) => <SessionItem key={session.id} session={session} timeZone={timeZone} />)
        )}
      </Card>

      <Card>
        <AppText variant="heading">What they did</AppText>
        {data.activities.length === 0 ? (
          <AppText muted>Nothing recorded.</AppText>
        ) : (
          <View style={styles.history}>
            {data.activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} showEntity />
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

const RANGES = [7, 14, 30] as const;

function TimesheetTab({ userId, today }: { userId: string; today: string }) {
  const { tracking } = useLeadOptions();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const to = today || todayIn(tracking.timeZone);
  const sheet = useTimesheet({ from: addDays(to, -(range - 1)), to, user: userId });
  const rows = [...(sheet.data?.rows ?? [])].reverse();

  return (
    <View style={styles.section}>
      <View style={styles.chips}>
        {RANGES.map((r) => (
          <Chip key={r} label={`Last ${r} days`} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </View>
      {sheet.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : !sheet.data ? (
        <AppText muted>{getErrorMessage(sheet.error)}</AppText>
      ) : (
        <View style={[styles.list, sheet.isPlaceholderData && styles.stale]}>
          {rows.map((row) => (
            <TimesheetCard key={row.date} row={row} by="date" timeZone={sheet.data.timeZone} />
          ))}
        </View>
      )}
    </View>
  );
}

function LoginsTab({ userId, timeZone }: { userId: string; timeZone: string }) {
  const sessions = useSessions(userId);
  const items = flattenPages(sessions.data);
  return (
    <Card>
      <AppText variant="heading">Login history</AppText>
      {sessions.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : items.length === 0 ? (
        <AppText muted>Never signed in.</AppText>
      ) : (
        items.map((session) => <SessionItem key={session.id} session={session} timeZone={timeZone} showDate />)
      )}
      {sessions.hasNextPage && (
        <Button
          title="Show older sign-ins"
          variant="ghost"
          loading={sessions.isFetchingNextPage}
          onPress={() => void sessions.fetchNextPage()}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  section: { gap: spacing.lg },
  stale: { opacity: 0.6 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  leadRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  right: { alignItems: "flex-end" },
  history: { gap: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  list: { gap: spacing.sm },
});
