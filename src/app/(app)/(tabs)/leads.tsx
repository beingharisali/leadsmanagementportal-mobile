import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { countFilters, LeadFiltersSheet, NO_FILTERS, type LeadFilters } from "@/features/leads/components/lead-filters-sheet";
import { LeadRow } from "@/features/leads/components/lead-row";
import { useLeads } from "@/features/leads/hooks";
import { LEAD_RATINGS, type Lead, type LeadListParams } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { isManagerRole } from "@/features/users/types";
import { flattenPages } from "@/lib/infinite";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";

/** Managers choose whose leads; agents only ever see their own. */
type Scope = "all" | "me" | "unassigned";
const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "me", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];

export default function LeadsScreen() {
  const user = useCurrentUser();
  const manager = isManagerRole(user.role);
  const canEdit = useCanEdit();
  const navigation = useNavigation();
  // Alerts can open this tab already filtered (?stale=true, ?assignedTo=unassigned).
  const params = useLocalSearchParams<{ stale?: string; assignedTo?: string; rating?: string; at?: string }>();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const [scope, setScope] = useState<Scope>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());

  // A link replaces the filters with its own (see lib/link-params.ts).
  const [appliedLink, setAppliedLink] = useState<string | undefined>(undefined);
  if (params.at && params.at !== appliedLink) {
    setAppliedLink(params.at);
    const rating = LEAD_RATINGS.find((r) => r === params.rating);
    setSearch("");
    setFilters({ ...NO_FILTERS, stale: params.stale === "true", rating: rating ? [rating] : [] });
    setScope(params.assignedTo === "unassigned" && manager ? "unassigned" : "all");
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEdit
        ? () => <HeaderButton label="Add lead" icon="add-circle-outline" onPress={() => router.push("/leads/new")} />
        : undefined,
    });
  }, [navigation, canEdit]);

  const query: LeadListParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: filters.status.length ? filters.status : undefined,
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

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => <LeadRow lead={item} showAssignee={manager} />,
    [manager],
  );

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
              </View>
            )}
            {total !== undefined && (
              <AppText variant="small" muted>
                {total} lead{total === 1 ? "" : "s"}
                {filters.stale ? " need attention" : ""}
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
                manager
                  ? "Add a lead with the + button, or import a spreadsheet on the website."
                  : "Leads assigned to you, or added by you, show here."
              }
            />
          )
        }
      />
      <LeadFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        total={total}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
