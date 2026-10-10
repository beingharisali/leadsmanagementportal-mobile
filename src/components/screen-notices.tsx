import { OfflineBanner } from "@/components/offline-banner";
import { SupportBanner } from "@/features/account/notices";
import { ViewAsBanner } from "@/features/tracking/view-as";

/** Notices at the top of every screen: offline, a Heapware support session, and "viewing as" for managers. */
export function ScreenNotices() {
  return (
    <>
      <SupportBanner />
      <ViewAsBanner />
      <OfflineBanner />
    </>
  );
}
