import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { useSupportSessions, type SupportSession } from "@/features/platform/hooks";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const END_LABELS: Record<NonNullable<SupportSession["endReason"]>, string> = {
  exited: "Exited",
  signed_out: "Signed out",
  expired: "Timed out",
};

function minutesBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
}

/** Heapware staff: every time someone at Heapware signed in as a customer, as whom and why. */
export default function SupportLogScreen() {
  const sessions = useSupportSessions();
  const renderItem = useCallback(({ item }: { item: SupportSession }) => <SessionRow session={item} />, []);

  return (
    <InfiniteList
      items={flattenPages(sessions.data)}
      renderItem={renderItem}
      keyExtractor={(session) => session.id}
      isPending={sessions.isPending}
      error={sessions.error}
      onRetry={() => void sessions.refetch()}
      onRefresh={() => sessions.refetch()}
      hasNextPage={sessions.hasNextPage}
      isFetchingNextPage={sessions.isFetchingNextPage}
      fetchNextPage={() => void sessions.fetchNextPage()}
      header={
        <AppText muted>
          Companies also see these in their own history. Start one from a company's page with "Sign in as user".
        </AppText>
      }
      empty={<EmptyView icon="help-buoy-outline" title="No support sign-ins yet" />}
    />
  );
}

function SessionRow({ session }: { session: SupportSession }) {
  const { colors } = useTheme();
  const active = !session.endedAt && new Date(session.expiresAt) > new Date();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <AppText weight="600" numberOfLines={1} style={styles.flex}>
          {session.organizationName}
        </AppText>
        {active ? (
          <Badge label="Active" color="violet" />
        ) : (
          <AppText variant="small" muted>
            {session.endedAt && session.endReason
              ? `${END_LABELS[session.endReason]} · ${minutesBetween(session.startedAt, session.endedAt)} min`
              : "Timed out"}
          </AppText>
        )}
      </View>
      <AppText variant="small" muted numberOfLines={1}>
        As {session.userName} · {session.userEmail}
      </AppText>
      <AppText variant="small">{session.reason}</AppText>
      <AppText variant="small" muted>
        {session.platformAdminName} · {formatDateTime(session.startedAt)}
        {session.ip ? ` · ${session.ip}` : ""}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { padding: spacing.md, borderWidth: 1, borderRadius: radius.lg, gap: spacing.xs },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
