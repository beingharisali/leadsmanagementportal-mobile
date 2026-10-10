/**
 * Parameters for a link that opens a tab already filtered (e.g. "Hot leads"
 * on the dashboard). The `at` stamp makes tapping the same link again apply
 * the filter again, even after the person changed it by hand.
 */
export function linkParams<T extends Record<string, string>>(params: T) {
  return { ...params, at: String(Date.now()) };
}
