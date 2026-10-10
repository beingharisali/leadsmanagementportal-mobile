import type { Paginated } from "./api-client";

/** `getNextPageParam` for the API's page-numbered lists. */
export function nextPage<T>(last: Paginated<T>) {
  return last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined;
}

/** Every loaded page's items, in order. */
export function flattenPages<T>(data: { pages: Paginated<T>[] } | undefined) {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
