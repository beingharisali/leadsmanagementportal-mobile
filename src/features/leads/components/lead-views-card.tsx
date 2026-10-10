import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useLeadViews } from "../hooks";

/** "1h 05m" · "12m" · "<1m" */
function formatMs(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "<1m";
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

const RECENT = 8;

/** Managers only: who opened this lead, when, and how long each person worked on it. */
export function LeadViewsCard({ leadId }: { leadId: string }) {
  const { colors } = useTheme();
  const views = useLeadViews(leadId, true);
  const data = views.data;
  const recent = data?.views.slice(0, RECENT) ?? [];

  return (
    <Card>
      <AppText variant="heading">Views & time spent</AppText>
      <AppText variant="small" muted>
        Visible to owners and admins only.
      </AppText>
      {views.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : !data || (data.views.length === 0 && data.timeByUser.length === 0) ? (
        <AppText muted>Nobody has opened this lead yet.</AppText>
      ) : (
        <>
          {data.timeByUser.map((row) => (
            <View key={row.user.id} style={styles.row}>
              <AppText style={styles.flex} numberOfLines={1}>
                {row.user.name}
              </AppText>
              <AppText variant="small">
                <AppText variant="small" weight="600">
                  {formatMs(row.activeMs)}
                </AppText>
                <AppText variant="small" muted>
                  {" active"}
                  {row.idleMs > 0 ? ` · ${formatMs(row.idleMs)} idle` : ""}
                </AppText>
              </AppText>
            </View>
          ))}
          {recent.length > 0 && (
            <View style={[styles.recent, { borderTopColor: colors.border }]}>
              <AppText variant="small" muted weight="600">
                Recently opened by
              </AppText>
              {recent.map((view) => (
                <View key={view.id} style={styles.row}>
                  <AppText variant="small" style={styles.flex} numberOfLines={1}>
                    {view.actor?.name ?? "Someone"}
                  </AppText>
                  <AppText variant="small" muted>
                    {formatDateTime(view.createdAt)}
                  </AppText>
                </View>
              ))}
              {data.views.length > recent.length && (
                <AppText variant="small" muted>
                  {data.views.length} opens in total
                </AppText>
              )}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recent: { gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs },
});
