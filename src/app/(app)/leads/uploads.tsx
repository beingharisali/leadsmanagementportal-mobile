import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyView } from "@/components/ui/state-views";
import { useRevertPreview, useRevertUpload, useUndoRevert, useUploadHistory } from "@/features/leads/hooks";
import type { UploadHistoryItem } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { useHasFeature } from "@/features/plans/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Managers: every imported spreadsheet. Revert moves the file's active leads
 * to the recycle bin; Undo revert brings back the ones a revert put there.
 */
export default function UploadHistoryScreen() {
  const hasImport = useHasFeature("import");
  const history = useUploadHistory();
  const items = flattenPages(history.data);

  const renderItem = useCallback(({ item }: { item: UploadHistoryItem }) => <UploadCard upload={item} />, []);

  if (!hasImport) {
    return (
      <EmptyView
        icon="lock-closed-outline"
        title="Not in your plan"
        message="Importing from Excel, and its upload history, come with a higher plan."
      />
    );
  }

  return (
    <InfiniteList
      items={items}
      renderItem={renderItem}
      keyExtractor={(u) => u.id}
      isPending={history.isPending}
      error={history.error}
      onRetry={() => void history.refetch()}
      onRefresh={() => history.refetch()}
      hasNextPage={history.hasNextPage}
      isFetchingNextPage={history.isFetchingNextPage}
      fetchNextPage={() => void history.fetchNextPage()}
      header={
        <AppText variant="small" muted>
          Files imported before upload history was added aren&apos;t listed and can&apos;t be reverted.
        </AppText>
      }
      empty={<EmptyView icon="document-text-outline" title="No uploads yet" message="Files you import from Excel or CSV show up here." />}
    />
  );
}

function UploadCard({ upload }: { upload: UploadHistoryItem }) {
  const { colors } = useTheme();
  const canEdit = useCanEdit();
  const preview = useRevertPreview();
  const revert = useRevertUpload();
  const undo = useUndoRevert();
  const last = upload.reverts.at(-1);

  function askRevert() {
    preview.mutate(upload.id, {
      onSuccess: ({ active, worked }) =>
        Alert.alert(
          `Revert ${upload.fileName}?`,
          `${plural(active, "lead")} from this file will move to the recycle bin.` +
            (worked > 0
              ? ` ${plural(worked, "lead")} ${worked === 1 ? "has" : "have"} been worked on since the upload (stage changes, calls, notes or follow-ups) and will move too.`
              : "") +
            " You can bring them back with Undo revert, or from the recycle bin.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Revert file",
              style: "destructive",
              onPress: () =>
                revert.mutate(upload.id, {
                  onSuccess: (r) =>
                    Alert.alert("File reverted", `${plural(r.reverted, "lead")} moved to the recycle bin.`),
                  onError: (e) => Alert.alert("Couldn't revert the file", getErrorMessage(e)),
                }),
            },
          ],
        ),
      onError: (e) => Alert.alert("Couldn't check the file", getErrorMessage(e)),
    });
  }

  function askUndo() {
    Alert.alert(
      `Undo revert of ${upload.fileName}?`,
      `${plural(upload.inBin, "lead")} will come back from the recycle bin. Any that clash with a lead added since, or would go over your plan's lead limit, stay in the bin.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Undo revert",
          onPress: () =>
            undo.mutate(upload.id, {
              onSuccess: (r) => {
                const notes = [
                  r.failed.length > 0 &&
                    `${plural(r.failed.length, "lead")} stayed in the recycle bin: ${r.failed
                      .slice(0, 3)
                      .map((f) => `${f.businessName} (${f.reason})`)
                      .join("; ")}${r.failed.length > 3 ? "…" : ""}`,
                  r.gone > 0 && `${plural(r.gone, "lead")} had already been restored or deleted for good.`,
                ].filter(Boolean);
                Alert.alert(`${plural(r.restored, "lead")} restored`, notes.join("\n\n") || undefined);
              },
              onError: (e) => Alert.alert("Couldn't undo the revert", getErrorMessage(e)),
            }),
        },
      ],
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="document-text-outline" size={18} color={colors.mutedText} />
        <AppText weight="600" numberOfLines={1} style={styles.flex}>
          {upload.fileName}
        </AppText>
        {last && <Badge label={last.undoneAt ? "Revert undone" : "Reverted"} color={last.undoneAt ? "slate" : "rose"} />}
      </View>
      <AppText variant="small" muted>
        {formatDateTime(upload.uploadedAt)}
        {upload.uploadedBy ? ` · by ${upload.uploadedBy.name}` : ""}
      </AppText>
      <AppText variant="small">
        {plural(upload.rowCount, "row")} · {upload.createdCount} created · {upload.activeCount} active now
        {upload.inBin > 0 ? ` · ${upload.inBin} in bin` : ""}
      </AppText>
      {last && (
        <AppText variant="small" muted>
          {last.undoneAt
            ? `Revert undone by ${last.undoneBy?.name ?? "someone"} · ${formatDateTime(last.undoneAt)}`
            : `Reverted by ${last.by?.name ?? "someone"} · ${formatDateTime(last.at)} · ${plural(last.count, "lead")}`}
        </AppText>
      )}
      {canEdit && (upload.activeCount > 0 || upload.inBin > 0) && (
        <View style={styles.actions}>
          {upload.inBin > 0 && (
            <Button
              title="Undo revert"
              icon="arrow-undo-outline"
              variant="secondary"
              loading={undo.isPending}
              onPress={askUndo}
              style={styles.flex}
            />
          )}
          {upload.activeCount > 0 && (
            <Button
              title="Revert"
              icon="refresh-outline"
              variant="secondary"
              loading={preview.isPending || revert.isPending}
              onPress={askRevert}
              style={styles.flex}
            />
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
