import { apiClient } from "@/lib/api-client";

/** `GET /mobile/config`: which app versions the API still supports, and where to update. */
export interface MobileConfig {
  minimumVersion: string;
  latestVersion: string;
  storeUrls: { android: string | null; ios: string | null };
}

export const appConfigApi = {
  // Long timeout: this is the first request, and a sleeping server can take a minute to wake.
  get: () => apiClient.get<MobileConfig>("/mobile/config", undefined, { timeoutMs: 90_000 }),
};

/** -1, 0 or 1, comparing versions like "1.2.10" and "1.10.0" number by number. */
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
