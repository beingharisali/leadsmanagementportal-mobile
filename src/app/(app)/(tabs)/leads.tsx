import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { countFilters, LeadFiltersSheet, NO_FILTERS, type LeadFilters } from "@/features/leads/components/lead-filters-sheet";
import { LeadRow } from "@/features/leads/components/lead-row";
import { useBulkAssign, useBulkDeleteLeads, useLeads } from "@/features/leads/hooks";
import { LEAD_RATINGS, type Lead, type LeadListParams } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { UNASSIGNED, UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import { useAssignableUsers } from "@/features/users/hooks";
import { isManagerRole } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Managers choose whose leads: everyone's, theirs, nobody's, or one agent's (a user id). */
type Scope = "all" | "me" | "unassigned" | (string & {});
const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "me", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];
const FIXED_SCOPES = SCOPES.map((s) => s.value);

export default function LeadsScreen() {
  const user = useCurrentUser();
  const manager = isManagerRole(user.role);
  const canEdit = useCanEdit();
  const canImport = manager && canEdit && (user.organization?.features.includes("import") ?? false);
  const navigation = useNavigation();
  const { colors } = useTheme();
  // Links can open this tab already filtered (see lib/link-params.ts).
  const params = useLocalSearchParams<{ stale?: string; assignedTo?: string; rating?: string; tag?: string; at?: string }>();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const [scope, setScope] = useState<Scope>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pickingAgent, setPickingAgent] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());
  const users = useAssignableUsers(manager);

  // Selecting several leads to assign at once (managers): long-press a lead to start.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [assigning, setAssigning] = useState(false);
  const bulkAssign = useBulkAssign();
  const bulkDelete = useBulkDeleteLeads();

  // A link replaces the filters with its own.
  const [appliedLink, setAppliedLink] = useState<string | undefined>(undefined);
  if (params.at && params.at !== appliedLink) {
    setAppliedLink(params.at);
    const rating = LEAD_RATINGS.find((r) => r === params.rating);
    setSearch("");
    setFilters({ ...NO_FILTERS, stale: params.stale === "true", rating: rating ? [rating] : [], tag: params.tag ?? "" });
    setScope(params.assignedTo && manager ? params.assignedTo : "all");
    setSelected(null);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: selected
        ? () => <HeaderButton label="Done" onPress={() => setSelected(null)} />
        : canEdit
          ? () => (
              <View style={styles.headerButtons}>
                {canImport && (
                  <HeaderButton label="Import leads" icon="cloud-upload-outline" onPress={() => router.push("/leads/import")} />
                )}
                <HeaderButton label="Add lead" icon="add-circle-outline" onPress={() => router.push("/leads/new")} />
              </View>
            )
          : undefined,
    });
  }, [navigation, canEdit, canImport, selected]);

  const query: LeadListParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: filters.status.length ? filters.status : undefined,
      source: filters.source.length ? filters.source : undefined,
      tag: filters.tag || undefined,
      rating: filters.rating.length ? filters.rating : undefined,
      stale: filters.stale || undefined,
      sort: filters.sort,
      assignedTo: manager && scope !== "all" ? scope : undefined,
    }),
    [debouncedSearch, filters, scope, manager],
  );

  const leads = useLeads(query);
  const items = flattenPages(leads.data);
  const total = leads.data?.pages[0]?.meta.total;
  const filterCount = countFilters(filters);
  const filtered = filterCount > 0 || !!debouncedSearch || scope !== "all";
  const agent = FIXED_SCOPES.includes(scope) ? undefined : users.data?.find((u) => u.id === scope);

  const toggle = useCallback((lead: Lead) => {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(lead.id)) next.delete(lead.id);
      else next.add(lead.id);
      return next;
    });
  }, []);

  const startSelecting = useCallback((lead: Lead) => setSelected(new Set([lead.id])), []);

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadRow
        lead={item}
        showAssignee={manager}
        selecting={!!selected}
        selected={selected?.has(item.id)}
        onToggle={toggle}
        onLongPress={manager && canEdit ? startSelecting : undefined}
      />
    ),
    [manager, canEdit, selected, toggle, startSelecting],
  );

  function assignSelected(assigneeId: string | null) {
    if (!selected || selected.size === 0) return;
    bulkAssign.mutate(
      { leadIds: [...selected], assigneeId },
      {
        onSuccess: (result) => {
          setAssigning(false);
          setSelected(null);
          const name = assigneeId ? (users.data?.find((u) => u.id === assigneeId)?.name ?? "them") : "nobody";
          Alert.alert(
            "Leads assigned",
            `${result.updated} lead${result.updated === 1 ? "" : "s"} given to ${name}.${
              result.skipped ? ` ${result.skipped} already belonged to them.` : ""
            }`,
          );
        },
        onError: (error) => Alert.alert("Couldn't assign the leads", getErrorMessage(error)),
      },
    );
  }

  function deleteSelected() {
    if (!selected || selected.size === 0) return;
    const count = selected.size;
    Alert.alert(
      `Move ${count} lead${count === 1 ? "" : "s"} to the recycle bin?`,
      "They will be hidden from every list. You can restore them from the recycle bin.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to bin",
          style: "destructive",
          onPress: () =>
            bulkDelete.mutate([...selected], {
              onSuccess: (result) => {
                setSelected(null);
                Alert.alert(
                  "Leads deleted",
                  `${result.deleted} lead${result.deleted === 1 ? "" : "s"} moved to the recycle bin.`,
                );
              },
              onError: (error) => Alert.alert("Couldn't delete the leads", getErrorMessage(error)),
            }),
        },
      ],
    );
  }

  const selectedCount = selected?.size ?? 0;

  return (
    <>
      <InfiniteList
        items={items}
        renderItem={renderItem}
        keyExtractor={(lead) => lead.id}
        isPending={leads.isPending}
        error={leads.error}
        onRetry={() => void leads.refetch()}
        onRefresh={() => leads.refetch()}
        hasNextPage={leads.hasNextPage}
        isFetchingNextPage={leads.isFetchingNextPage}
        fetchNextPage={() => void leads.fetchNextPage()}
        header={
          <>
            <View style={styles.searchRow}>
              <SearchField value={search} onChangeText={setSearch} placeholder="Search name, business, phone" />
              <Chip
                label={filterCount ? `Filters · ${filterCount}` : "Filters"}
                icon="options-outline"
                selected={filterCount > 0}
                onPress={() => setFiltersOpen(true)}
              />
            </View>
            {manager && (
              <View style={styles.chips}>
                {SCOPES.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={scope === option.value}
                    onPress={() => setScope(option.value)}
                  />
                ))}
                <Chip
                  label={agent ? agent.name : "Agent…"}
                  icon="person-outline"
                  selected={!!agent}
                  onPress={() => setPickingAgent(true)}
                />
              </View>
            )}
            {total !== undefined && (
              <AppText variant="small" muted>
                {total} lead{total === 1 ? "" : "s"}
                {filters.stale ? " need attention" : ""}
                {filters.tag ? ` tagged "${filters.tag}"` : ""}
                {manager && canEdit && !selected && total > 0 ? " · long-press to select several" : ""}
              </AppText>
            )}
          </>
        }
        empty={
          filtered ? (
            <EmptyView icon="search-outline" title="No leads match" message="Try another search or clear the filters." />
          ) : (
            <EmptyView
              icon="people-outline"
              title="No leads yet"
              message={
                manager ? "Add a lead with the + button, or import a spreadsheet." : "Leads assigned to you, or added by you, show here."
              }
            />
          )
        }
      />

      {selected && (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: spacing.md },
          ]}
        >
          <AppText weight="600" style={styles.flex}>
            {selectedCount} selected
          </AppText>
          <Button
            title="Select all shown"
            variant="ghost"
            onPress={() => setSelected(new Set(items.map((l) => l.id)))}
            style={styles.barButton}
          />
          <Button
            title="Assign"
            icon="person-add-outline"
            disabled={selectedCount === 0}
            onPress={() => setAssigning(true)}
            style={styles.barButton}
          />
          <Button
            title="Delete"
            icon="trash-outline"
            variant="danger"
            disabled={selectedCount === 0}
            loading={bulkDelete.isPending}
            onPress={deleteSelected}
            style={styles.barButton}
          />
        </View>
      )}

      <LeadFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        total={total}
      />
      {manager && (
        <>
          <UserPickerSheet
            open={pickingAgent}
            onClose={() => setPickingAgent(false)}
            title="Show leads of"
            value={agent?.id ?? (scope === "unassigned" ? UNASSIGNED : null)}
            onSelect={(id) => {
              setScope(id ?? "unassigned");
              setPickingAgent(false);
            }}
          />
          <UserPickerSheet
            open={assigning}
            onClose={() => setAssigning(false)}
            title={`Assign ${selectedCount} lead${selectedCount === 1 ? "" : "s"} to`}
            subtitle="They get an alert."
            value={null}
            onSelect={assignSelected}
            busy={bulkAssign.isPending}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerButtons: { flexDirection: "row", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  selectionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barButton: { minHeight: 40, paddingHorizontal: spacing.md },
});
