import { OfflineBanner } from "@/components/offline-banner";
import { SupportBanner } from "@/features/account/notices";
import { CheckInBar } from "@/features/check-ins/check-in-bar";
import { ViewAsBanner } from "@/features/tracking/view-as";

/**
 * Notices at the top of every screen: offline, a Heapware support session,
 * "viewing as" for managers, and the check-in bar for people who check in.
 */
export function ScreenNotices() {
  return (
    <>
      <SupportBanner />
      <ViewAsBanner />
      <OfflineBanner />
      <CheckInBar />
    </>
  );
}
