import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import { StageBadge } from "@/features/leads/components/lead-badges";
import { useRestoreLead, useTrash } from "@/features/leads/hooks";
import type { Lead } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Managers: deleted leads, which can be restored at any time. */
export default function RecycleBinScreen() {
  const canEdit = useCanEdit();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const trash = useTrash(debouncedSearch);
  const restore = useRestoreLead();

  const handleRestore = useCallback(
    (lead: Lead) =>
      restore.mutate(lead.id, {
        onSuccess: () => Alert.alert("Lead restored", `${lead.businessName} is back in the leads list.`),
        onError: (error) => Alert.alert("Couldn't restore it", getErrorMessage(error)),
      }),
    [restore],
  );

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <DeletedLeadRow
        lead={item}
        restoring={restore.isPending && restore.variables === item.id}
        onRestore={canEdit ? () => handleRestore(item) : undefined}
      />
    ),
    [canEdit, handleRestore, restore.isPending, restore.variables],
  );

  return (
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
          message="Deleted leads appear here and can be restored at any time."
        />
      }
    />
  );
}

function DeletedLeadRow({ lead, restoring, onRestore }: { lead: Lead; restoring: boolean; onRestore?: () => void }) {
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
      {onRestore && (
        <Button title="Restore" variant="secondary" icon="refresh" loading={restoring} onPress={onRestore} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  button: { minHeight: 40, paddingHorizontal: spacing.md },
});
