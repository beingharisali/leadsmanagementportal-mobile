import { router, Stack } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { HeaderButton } from "@/components/ui/header-button";
import { InfiniteList } from "@/components/ui/infinite-list";
import { SearchField } from "@/components/ui/search-field";
import { EmptyView } from "@/components/ui/state-views";
import type { BillingStatus, OrganizationStatus } from "@/features/organizations/types";
import { CompanyRow, OrganizationStatusBadge } from "@/features/platform/components/company-row";
import {
  BILLING_STATUSES,
  billingLine,
  billingStatusLabels,
  usePlatformOrganizations,
  type PlatformOrganization,
} from "@/features/platform/hooks";
import { PLAN_KEYS, planLabels, type PlanKey } from "@/features/plans/types";
import { flattenPages } from "@/lib/infinite";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";

const STATUS_FILTERS: { value: OrganizationStatus | undefined; label: string }[] = [
  { value: undefined, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

/** Heapware staff: every company using GetCloseWise. Tap one to manage it. */
export default function CompaniesScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrganizationStatus>();
  const [plan, setPlan] = useState<PlanKey>();
  const [billing, setBilling] = useState<BillingStatus>();
  const debouncedSearch = useDebouncedValue(search.trim());
  const companies = usePlatformOrganizations({ search: debouncedSearch || undefined, status, plan, billingStatus: billing });
  const filtered = !!debouncedSearch || !!status || !!plan || !!billing;

  const renderItem = useCallback(
    ({ item }: { item: PlatformOrganization }) => (
      <CompanyRow
        organization={item}
        detail={
          <>
            <View style={styles.detail}>
              <OrganizationStatusBadge organization={item} />
              <AppText variant="small" muted numberOfLines={1}>
                {planLabels[item.plan] ?? item.plan} · {billingLine(item)}
              </AppText>
            </View>
            <AppText variant="small" muted numberOfLines={1}>
              Last sign-in {item.usage.lastLoginAt ? formatDateTime(item.usage.lastLoginAt) : "never"}
            </AppText>
          </>
        }
      />
    ),
    [],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton label="Add company" icon="add" onPress={() => router.push("/console/companies/new")} />
          ),
        }}
      />
      <InfiniteList
        items={flattenPages(companies.data)}
        renderItem={renderItem}
        keyExtractor={(organization) => organization.id}
        isPending={companies.isPending}
        error={companies.error}
        onRetry={() => void companies.refetch()}
        onRefresh={() => companies.refetch()}
        hasNextPage={companies.hasNextPage}
        isFetchingNextPage={companies.isFetchingNextPage}
        fetchNextPage={() => void companies.fetchNextPage()}
        header={
          <>
            <SearchField value={search} onChangeText={setSearch} placeholder="Search companies" />
            <View style={styles.chips}>
              {STATUS_FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />
              ))}
            </View>
            <View style={styles.chips}>
              <Chip label="All plans" selected={!plan} onPress={() => setPlan(undefined)} />
              {PLAN_KEYS.map((p) => (
                <Chip key={p} label={planLabels[p]} selected={plan === p} onPress={() => setPlan(p)} />
              ))}
            </View>
            <View style={styles.chips}>
              <Chip label="Trial and paid" selected={!billing} onPress={() => setBilling(undefined)} />
              {BILLING_STATUSES.map((b) => (
                <Chip key={b} label={billingStatusLabels[b]} selected={billing === b} onPress={() => setBilling(b)} />
              ))}
            </View>
          </>
        }
        empty={
          <EmptyView
            icon="business-outline"
            title="No companies found"
            message={filtered ? "Try another search or clear the filters." : undefined}
          />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detail: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
});
