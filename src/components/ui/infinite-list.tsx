import { useState, type ReactElement } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenNotices } from "@/components/screen-notices";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { ErrorView, LoadingView } from "./state-views";

interface InfiniteListProps<T> {
  items: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  /** First page loading */
  isPending: boolean;
  /** Only shown when nothing loaded */
  error: unknown;
  onRetry: () => void;
  onRefresh: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** Scrolls with the list: search, filters, counts */
  header?: ReactElement;
  /** Shown when the list is empty */
  empty: ReactElement;
}

/** A full-screen list that loads more as you scroll, with pull-to-refresh and its own loading/error states. */
export function InfiniteList<T>({
  items,
  renderItem,
  keyExtractor,
  isPending,
  error,
  onRetry,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  header,
  empty,
}: InfiniteListProps<T>) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  const body = isPending ? <LoadingView /> : error && items.length === 0 ? <ErrorView error={error} onRetry={onRetry} /> : empty;

  return (
    <SafeAreaView edges={["left", "right"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={isPending ? [] : items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenNotices />
            {header}
          </View>
        }
        ListEmptyComponent={body}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null
        }
        ItemSeparatorComponent={Separator}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: spacing.sm + 2 },
  footer: { marginVertical: spacing.lg },
});
