import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Screen } from "@/components/ui/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { userRoleLabels, type User } from "@/features/users/types";
import { apiClient, type Paginated } from "@/lib/api-client";
import { getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

interface Node {
  user: User;
  reports: Node[];
}

function buildTree(users: User[]): Node[] {
  const byId = new Map(users.map((u) => [u.id, { user: u, reports: [] as Node[] }]));
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const manager = node.user.reportsTo ? byId.get(node.user.reportsTo) : undefined;
    if (manager && manager !== node) manager.reports.push(node);
    else roots.push(node);
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => a.user.name.localeCompare(b.user.name));
    nodes.forEach((n) => sort(n.reports));
  };
  sort(roots);
  return roots;
}

export default function OrgChartScreen() {
  const me = useCurrentUser();
  const enabled = me.organization?.features.includes("teamWorkspace") ?? false;
  const query = useQuery({
    queryKey: ["users", "org-chart"],
    queryFn: () => apiClient.getPaginated<User>("/users", { limit: 200, status: "active" }),
    enabled,
  });

  if (!enabled) {
    return (
      <Screen>
        <EmptyView icon="lock-closed-outline" title="Team Workspace isn't enabled" message="Contact GetCloseWise to turn it on." />
      </Screen>
    );
  }
  if (query.isPending) return <LoadingView />;
  if (query.error) return <ErrorView error={query.error} onRetry={() => void query.refetch()} />;

  const users = (query.data as Paginated<User>).items;
  const tree = buildTree(users);

  return (
    <Screen>
      {users.length === 0 ? (
        <EmptyView icon="git-network-outline" title="No team members yet" message="Add people to see the org chart." />
      ) : (
        <View style={styles.tree}>
          {tree.map((node) => (
            <TreeNode key={node.user.id} node={node} depth={0} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginLeft: depth * spacing.lg }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="small" weight="700" color={colors.primary}>
            {getInitials(node.user.name)}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText weight="600" numberOfLines={1}>
            {node.user.name}
          </AppText>
          <AppText variant="small" muted>
            {userRoleLabels[node.user.role]}
          </AppText>
        </View>
        {node.reports.length > 0 && <Badge label={`${node.reports.length}`} color="indigo" />}
      </View>
      {node.reports.map((child) => (
        <TreeNode key={child.user.id} node={child} depth={depth + 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tree: { gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  avatar: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
