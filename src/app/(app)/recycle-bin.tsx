import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import { StageBadge } from "@/features/leads/components/lead-badges";
import { useEmptyTrash, usePurgeLead, useRestoreLead, useTrash } from "@/features/leads/hooks";
import type { Lead } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Managers: deleted leads, which can be restored or deleted for good. */
export default function RecycleBinScreen() {
  const canEdit = useCanEdit();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const trash = useTrash(debouncedSearch);
  const restore = useRestoreLead();
  const purge = usePurgeLead();
  const emptyTrash = useEmptyTrash();
  const total = trash.data?.pages[0]?.meta.total ?? 0;

  const handleRestore = useCallback(
    (lead: Lead) =>
      restore.mutate(lead.id, {
        onSuccess: () => Alert.alert("Lead restored", `${lead.businessName} is back in the leads list.`),
        onError: (error) => Alert.alert("Couldn't restore it", getErrorMessage(error)),
      }),
    [restore],
  );

  const handlePurge = useCallback(
    (lead: Lead) =>
      Alert.alert(
        `Delete ${lead.businessName} permanently?`,
        "The lead and everything on it (history, calls, comments, follow-ups and files) is removed for good. This can't be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete forever",
            style: "destructive",
            onPress: () =>
              purge.mutate(lead.id, {
                onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)),
              }),
          },
        ],
      ),
    [purge],
  );

  const handleEmpty = useCallback(
    () =>
      Alert.alert(
        "Empty the recycle bin?",
        `All ${total} ${total === 1 ? "lead" : "leads"} in the recycle bin, and everything on them, will be deleted for good. This can't be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Empty recycle bin",
            style: "destructive",
            onPress: () =>
              emptyTrash.mutate(undefined, {
                onSuccess: (result) =>
                  Alert.alert(
                    "Recycle bin emptied",
                    `${result.deleted} ${result.deleted === 1 ? "lead" : "leads"} deleted permanently.`,
                  ),
                onError: (error) => Alert.alert("Couldn't empty it", getErrorMessage(error)),
              }),
          },
        ],
      ),
    [emptyTrash, total],
  );

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <DeletedLeadRow
        lead={item}
        restoring={restore.isPending && restore.variables === item.id}
        onRestore={canEdit ? () => handleRestore(item) : undefined}
        purging={purge.isPending && purge.variables === item.id}
        onPurge={canEdit ? () => handlePurge(item) : undefined}
      />
    ),
    [canEdit, handleRestore, handlePurge, restore.isPending, restore.variables, purge.isPending, purge.variables],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: canEdit
            ? () => (
                <HeaderButton
                  label="Empty recycle bin"
                  icon="trash-outline"
                  disabled={total === 0 || !!debouncedSearch || emptyTrash.isPending}
                  onPress={handleEmpty}
                />
              )
            : undefined,
        }}
      />
      <InfiniteList
        items={flattenPages(trash.data)}
        renderItem={renderItem}
        keyExtractor={(lead) => lead.id}
        isPending={trash.isPending}
        error={trash.error}
        onRetry={() => void trash.refetch()}
        onRefresh={() => trash.refetch()}
        hasNextPage={trash.hasNextPage}
        isFetchingNextPage={trash.isFetchingNextPage}
        fetchNextPage={() => void trash.fetchNextPage()}
        header={<SearchField value={search} onChangeText={setSearch} placeholder="Search deleted leads" />}
        empty={
          <EmptyView
            icon="trash-outline"
            title={debouncedSearch ? "No deleted leads match" : "Recycle bin is empty"}
            message="Deleted leads appear here. Restore them or delete them for good."
          />
        }
      />
    </>
  );
}

interface DeletedLeadRowProps {
  lead: Lead;
  restoring: boolean;
  onRestore?: () => void;
  purging: boolean;
  onPurge?: () => void;
}

function DeletedLeadRow({ lead, restoring, onRestore, purging, onPurge }: DeletedLeadRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.flex}>
        <AppText weight="600" numberOfLines={1}>
          {lead.businessName}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {lead.name} · {lead.phone}
        </AppText>
        <StageBadge status={lead.status} />
        <AppText variant="small" muted>
          {lead.assignedTo?.name ?? "Unassigned"}
          {lead.deletedAt ? ` · deleted ${formatDateTime(lead.deletedAt)}` : ""}
          {lead.deletedBy ? ` by ${lead.deletedBy.name}` : ""}
        </AppText>
      </View>
      <View style={styles.actions}>
        {onRestore && (
          <Button title="Restore" variant="secondary" icon="refresh" loading={restoring} onPress={onRestore} style={styles.button} />
        )}
        {onPurge && (
          <Button title="Delete" variant="ghost" icon="trash-outline" loading={purging} onPress={onPurge} style={styles.button} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  actions: { gap: spacing.xs },
  button: { minHeight: 40, paddingHorizontal: spacing.md },
});
