import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import { StageBadge } from "@/features/leads/components/lead-badges";
import {
  useBulkPurgeLeads,
  useBulkRestoreLeads,
  useEmptyTrash,
  usePurgeLead,
  useRestoreLead,
  useTrash,
} from "@/features/leads/hooks";
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
  const items = flattenPages(trash.data);
  const { colors } = useTheme();

  // Selecting several leads (long-press one to start) to restore or delete them together.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const bulkRestore = useBulkRestoreLeads();
  const bulkPurge = useBulkPurgeLeads();
  const selectedCount = selected?.size ?? 0;

  const toggle = useCallback((lead: Lead) => {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(lead.id)) next.delete(lead.id);
      else next.add(lead.id);
      return next;
    });
  }, []);

  const startSelecting = useCallback((lead: Lead) => setSelected(new Set([lead.id])), []);

  function restoreSelected() {
    if (!selected || selected.size === 0) return;
    bulkRestore.mutate([...selected], {
      onSuccess: (result) => {
        // Leads that couldn't come back stay selected so they're easy to find.
        setSelected(result.failed.length ? new Set(result.failed.map((f) => f.id)) : null);
        const lines = [`${result.restored} lead${result.restored === 1 ? "" : "s"} back in the leads list.`];
        if (result.failed.length) {
          lines.push(
            "",
            `${result.failed.length} couldn't be restored:`,
            ...result.failed.slice(0, 5).map((f) => `• ${f.businessName}: ${f.reason}`),
          );
          if (result.failed.length > 5) lines.push(`…and ${result.failed.length - 5} more`);
        }
        Alert.alert(result.failed.length ? "Some leads not restored" : "Leads restored", lines.join("\n"));
      },
      onError: (error) => Alert.alert("Couldn't restore them", getErrorMessage(error)),
    });
  }

  function purgeSelected() {
    if (!selected || selected.size === 0) return;
    const count = selected.size;
    Alert.alert(
      `Delete ${count} lead${count === 1 ? "" : "s"} permanently?`,
      "These leads and everything on them (history, calls, comments, follow-ups and files) are removed for good. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () =>
            bulkPurge.mutate([...selected], {
              onSuccess: (result) => {
                setSelected(null);
                Alert.alert(
                  "Leads deleted",
                  `${result.deleted} lead${result.deleted === 1 ? "" : "s"} deleted permanently.`,
                );
              },
              onError: (error) => Alert.alert("Couldn't delete them", getErrorMessage(error)),
            }),
        },
      ],
    );
  }

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
        selecting={!!selected}
        selected={selected?.has(item.id)}
        onToggle={() => toggle(item)}
        onLongPress={canEdit ? () => startSelecting(item) : undefined}
      />
    ),
    [
      canEdit,
      handleRestore,
      handlePurge,
      restore.isPending,
      restore.variables,
      purge.isPending,
      purge.variables,
      selected,
      toggle,
      startSelecting,
    ],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: selected
            ? () => <HeaderButton label="Done" onPress={() => setSelected(null)} />
            : canEdit
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
        items={items}
        renderItem={renderItem}
        keyExtractor={(lead) => lead.id}
        isPending={trash.isPending}
        error={trash.error}
        onRetry={() => void trash.refetch()}
        onRefresh={() => trash.refetch()}
        hasNextPage={trash.hasNextPage}
        isFetchingNextPage={trash.isFetchingNextPage}
        fetchNextPage={() => void trash.fetchNextPage()}
        header={
          <>
            <SearchField
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setSelected(null);
              }}
              placeholder="Search deleted leads"
            />
            {canEdit && !selected && total > 0 && (
              <AppText variant="small" muted>
                Long-press to select several
              </AppText>
            )}
          </>
        }
        empty={
          <EmptyView
            icon="trash-outline"
            title={debouncedSearch ? "No deleted leads match" : "Recycle bin is empty"}
            message="Deleted leads appear here. Restore them or delete them for good."
          />
        }
      />

      {selected && (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: spacing.md },
          ]}
        >
          <AppText weight="600" style={styles.grow}>
            {selectedCount} selected
          </AppText>
          <Button
            title="Select all shown"
            variant="ghost"
            onPress={() => setSelected(new Set(items.map((l) => l.id)))}
            style={styles.button}
          />
          <Button
            title="Restore"
            icon="refresh"
            disabled={selectedCount === 0}
            loading={bulkRestore.isPending}
            onPress={restoreSelected}
            style={styles.button}
          />
          <Button
            title="Delete"
            icon="trash-outline"
            variant="danger"
            disabled={selectedCount === 0}
            loading={bulkPurge.isPending}
            onPress={purgeSelected}
            style={styles.button}
          />
        </View>
      )}
    </>
  );
}

interface DeletedLeadRowProps {
  lead: Lead;
  restoring: boolean;
  onRestore?: () => void;
  purging: boolean;
  onPurge?: () => void;
  /** Selecting several leads: a tap toggles and the row's own buttons hide */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Starts selecting */
  onLongPress?: () => void;
}

function DeletedLeadRow({
  lead,
  restoring,
  onRestore,
  purging,
  onPurge,
  selecting,
  selected,
  onToggle,
  onLongPress,
}: DeletedLeadRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={selecting ? "checkbox" : undefined}
      accessibilityState={selecting ? { checked: selected } : undefined}
      onPress={selecting ? onToggle : undefined}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
        selected && { backgroundColor: colors.primarySoft },
      ]}
    >
      {selecting && (
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={selected ? colors.primary : colors.mutedText}
        />
      )}
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
      {!selecting && (
        <View style={styles.actions}>
          {onRestore && (
            <Button title="Restore" variant="secondary" icon="refresh" loading={restoring} onPress={onRestore} style={styles.button} />
          )}
          {onPurge && (
            <Button title="Delete" variant="ghost" icon="trash-outline" loading={purging} onPress={onPurge} style={styles.button} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  actions: { gap: spacing.xs },
  button: { minHeight: 40, paddingHorizontal: spacing.md },
  grow: { flex: 1 },
  selectionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
