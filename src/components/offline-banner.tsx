import { useNetworkState } from "expo-network";

import { Banner } from "@/components/ui/banner";

/** Shown at the top of screens while the phone has no connection. */
export function OfflineBanner() {
  const network = useNetworkState();
  // `undefined` while the first reading comes in: don't flash the banner.
  if (network.isConnected !== false && network.isInternetReachable !== false) return null;
  return (
    <Banner tone="warning" title="You're offline" message="Showing what was loaded before. Changes need a connection." />
  );
}
