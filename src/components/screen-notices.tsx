import { OfflineBanner } from "@/components/offline-banner";
import { ViewAsBanner } from "@/features/tracking/view-as";

/** Notices at the top of every screen: offline, and "viewing as" for managers. */
export function ScreenNotices() {
  return (
    <>
      <ViewAsBanner />
      <OfflineBanner />
    </>
  );
}
