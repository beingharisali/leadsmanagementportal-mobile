import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { AnnouncementSheet } from "@/features/platform/components/announcement-sheet";
import {
  announcementLevelLabels,
  useDeleteAnnouncement,
  usePlatformAnnouncements,
  useUpdateAnnouncement,
  type Announcement,
} from "@/features/platform/hooks";
import { planLabels } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { spacing } from "@/theme/colors";

/** Heapware staff: news, maintenance windows and offers shown at the top of customers' workspaces. */
export default function AnnouncementsScreen() {
  const announcements = usePlatformAnnouncements();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();
  const [creating, setCreating] = useState(false);

  function endNow(announcement: Announcement) {
    update.mutate(
      { id: announcement.id, payload: { endsAt: new Date().toISOString() } },
      {
        onSuccess: () => Alert.alert("Announcement ended"),
        onError: (error) => Alert.alert("Couldn't end it", getErrorMessage(error)),
      },
    );
  }

  function confirmDelete(announcement: Announcement) {
    Alert.alert("Delete this announcement?", "It disappears from every workspace. Emails already sent can't be recalled.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(announcement.id, {
            onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)),
          }),
      },
    ]);
  }

  const header = (
    <Stack.Screen
      options={{ headerRight: () => <HeaderButton label="New announcement" icon="add" onPress={() => setCreating(true)} /> }}
    />
  );
  const sheet = <AnnouncementSheet open={creating} onClose={() => setCreating(false)} />;

  if (announcements.isPending) return <LoadingView />;
  if (!announcements.data) return <ErrorView error={announcements.error} onRetry={() => void announcements.refetch()} />;

  if (announcements.data.length === 0) {
    return (
      <>
        {header}
        <EmptyView icon="megaphone-outline" title="No announcements yet" message="Publish one to reach every company at once." />
        {sheet}
      </>
    );
  }

  return (
    <>
      {header}
      <Screen onRefresh={() => announcements.refetch()}>
        {announcements.data.map((announcement) => (
          <Card key={announcement.id}>
            <AppText weight="600">{announcement.title}</AppText>
            <View style={styles.badges}>
              {announcement.live ? <Badge label="Live" color="emerald" /> : <Badge label="Ended" />}
              <Badge label={announcementLevelLabels[announcement.level]} color="sky" />
            </View>
            <AppText muted>{announcement.body}</AppText>
            <AppText variant="small" muted>
              {announcement.plans.length === 0 ? "Every company" : announcement.plans.map((p) => planLabels[p]).join(", ")} · from{" "}
              {formatDate(announcement.startsAt)}
              {announcement.endsAt ? ` until ${formatDate(announcement.endsAt)}` : ""} · closed by {announcement.dismissedCount}{" "}
              {announcement.dismissedCount === 1 ? "user" : "users"}
              {announcement.emailed ? ` · emailed to ${announcement.emailedCount}` : ""}
            </AppText>
            <View style={styles.actions}>
              {announcement.live && (
                <Button
                  title="End now"
                  variant="secondary"
                  loading={update.isPending && update.variables?.id === announcement.id}
                  onPress={() => endNow(announcement)}
                  style={styles.action}
                />
              )}
              <Button title="Delete" variant="ghost" onPress={() => confirmDelete(announcement)} style={styles.action} />
            </View>
          </Card>
        ))}
      </Screen>
      {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
});
