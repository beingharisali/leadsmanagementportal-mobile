import type Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { formatMoney, invoiceStatusLabels, paymentStatusLabels } from "@/features/billing/hooks";
import { useLeadOptions } from "@/features/customization/hooks";
import { planFeatureLabels, planLabels } from "@/features/plans/types";
import { projectStatusLabels } from "@/features/projects/types";
import { featuresFor, matchFeatures } from "@/features/search/catalog";
import { usePlatformSearch, useWorkspaceSearch } from "@/features/search/hooks";
import { MIN_SEARCH_LENGTH } from "@/features/search/types";
import { useWorkAccess } from "@/features/tasks/hooks";
import { taskStatusLabels } from "@/features/tasks/types";
import { userRoleLabels } from "@/features/users/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface Row {
  key: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  href: Href;
  /** Plan feature it needs, when the company doesn't have it */
  lockedFeature?: string;
}

interface Group {
  label: string;
  rows: Row[];
}

/** Features shown at most once something is typed. */
const MAX_FEATURES = 8;

const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

/**
 * Search the whole app: every feature the person can use (locked ones
 * marked) and, from 2 letters, the records they can open: leads, team
 * members, tasks, projects and departments; for Heapware staff also
 * companies, invoices and payments.
 */
export default function SearchScreen() {
  const user = useCurrentUser();
  const work = useWorkAccess();
  const { colors } = useTheme();
  const { stageLabel } = useLeadOptions();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 250);
  const query = q.trim();
  const searching = query.length >= MIN_SEARCH_LENGTH;

  const workspace = useWorkspaceSearch(debounced);
  const platform = usePlatformSearch(debounced, Boolean(user.isPlatformAdmin));
  const loading = searching && (workspace.isFetching || platform.isFetching || debounced.trim() !== query);

  const groups = useMemo<Group[]>(() => {
    const features = matchFeatures(featuresFor(user, work), query)
      .slice(0, query ? MAX_FEATURES : undefined)
      .map<Row>((f) => ({
        key: `feature:${f.section}:${f.title}`,
        icon: f.icon,
        title: f.title,
        subtitle: f.locked ? "Not in your plan" : f.section,
        href: f.href,
        lockedFeature: f.locked && f.feature ? planFeatureLabels[f.feature] : undefined,
      }));
    const result: Group[] = [{ label: query ? "Features" : "Go to", rows: features }];
    if (!searching) return result;

    const w = workspace.data;
    if (w) {
      result.push(
        {
          label: "Leads",
          rows: w.leads.map((lead) => ({
            key: `lead:${lead.id}`,
            icon: "people-outline",
            title: lead.name,
            subtitle: join(lead.businessName, lead.phone, stageLabel(lead.status)),
            href: { pathname: "/leads/[id]", params: { id: lead.id } },
          })),
        },
        {
          label: "Team",
          rows: w.people.map((person) => ({
            key: `person:${person.id}`,
            icon: "person-outline",
            title: person.name,
            subtitle: join(person.email, userRoleLabels[person.role], !person.isActive && "Inactive"),
            href: { pathname: "/team/[id]", params: { id: person.id } },
          })),
        },
        {
          label: "Tasks",
          rows: w.tasks.map((task) => ({
            key: `task:${task.id}`,
            icon: "clipboard-outline",
            title: task.title,
            subtitle: taskStatusLabels[task.status],
            href: { pathname: "/tasks/[id]", params: { id: task.id } },
          })),
        },
        {
          label: "Projects",
          rows: w.projects.map((project) => ({
            key: `project:${project.id}`,
            icon: "folder-open-outline",
            title: project.name,
            subtitle: join(project.clientName, projectStatusLabels[project.status]),
            href: { pathname: "/projects/[id]", params: { id: project.id } },
          })),
        },
        {
          label: "Departments",
          rows: w.departments.map((department) => ({
            key: `department:${department.id}`,
            icon: "git-network-outline",
            title: department.name,
            subtitle: `${department.memberCount} ${department.memberCount === 1 ? "person" : "people"}`,
            href: { pathname: "/departments/[id]", params: { id: department.id } },
          })),
        },
      );
    }

    const p = user.isPlatformAdmin ? platform.data : undefined;
    if (p) {
      result.push(
        {
          label: "Companies",
          rows: p.companies.map((company) => ({
            key: `company:${company.id}`,
            icon: "business-outline",
            title: company.name,
            subtitle: join(planLabels[company.plan], company.status === "suspended" && "Suspended"),
            href: { pathname: "/console/companies/[id]", params: { id: company.id } },
          })),
        },
        {
          label: "Invoices",
          rows: p.invoices.map((invoice) => ({
            key: `invoice:${invoice.id}`,
            icon: "document-text-outline",
            title: invoice.number,
            subtitle: join(invoice.company, formatMoney(invoice.amount, invoice.currency), invoiceStatusLabels[invoice.status]),
            href: { pathname: "/console/invoices", params: { search: invoice.number } },
          })),
        },
        {
          label: "Payments",
          rows: p.payments.map((payment) => ({
            key: `payment:${payment.id}`,
            icon: "card-outline",
            title: payment.reference,
            subtitle: join(payment.company, payment.invoiceNumber, paymentStatusLabels[payment.status]),
            href: { pathname: "/console/payments", params: { search: payment.reference, status: payment.status } },
          })),
        },
      );
    }
    return result.filter((group) => group.rows.length > 0);
  }, [user, work, query, searching, workspace.data, platform.data, stageLabel]);

  function open(row: Row) {
    if (row.lockedFeature) {
      Alert.alert("Not included in your plan", `${row.title} comes with a higher plan. The owner can upgrade on the website.`);
      return;
    }
    router.push(row.href);
  }

  return (
    <Screen>
      <SearchField
        value={q}
        onChangeText={setQ}
        placeholder={user.isPlatformAdmin ? "Features, leads, team, companies..." : "Features, leads, team, tasks..."}
        autoFocus
      />

      {loading && <ActivityIndicator color={colors.primary} />}

      {groups.length === 0 && !loading ? (
        <AppText muted style={styles.center}>
          Nothing found for &quot;{query}&quot;
        </AppText>
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.section}>
            <AppText variant="small" muted style={styles.sectionLabel}>
              {group.label.toUpperCase()}
            </AppText>
            <Card style={styles.flush}>
              {group.rows.map((row, index) => (
                <View key={row.key} style={index > 0 && [styles.divider, { borderTopColor: colors.border }]}>
                  <ListRow
                    icon={row.icon}
                    title={row.title}
                    subtitle={row.subtitle}
                    trailingIcon={row.lockedFeature ? "lock-closed" : undefined}
                    onPress={() => open(row)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}

      {query.length > 0 && !searching && (
        <AppText variant="small" muted style={styles.center}>
          Type {MIN_SEARCH_LENGTH} or more letters to search records too.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flush: { padding: 0, gap: 0, overflow: "hidden" },
  section: { gap: spacing.sm },
  sectionLabel: { paddingHorizontal: spacing.xs, letterSpacing: 0.5 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  center: { textAlign: "center" },
});
