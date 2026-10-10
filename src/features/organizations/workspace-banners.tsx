import { daysUntil } from "@/lib/format";
import { Banner } from "@/components/ui/banner";
import type { User } from "@/features/users/types";

/** The same notices the website shows above every page, most important first. */
export function WorkspaceBanners({ user }: { user: User }) {
  const organization = user.organization;
  if (!organization) return null;

  if (organization.readOnly) {
    return (
      <Banner
        tone="danger"
        title="Read-only"
        message={`${organization.readOnlyReason ?? "This workspace is read-only."} You can look at everything but not make changes.${
          user.role === "owner" ? " Billing is managed on the website." : " Ask your company's owner to sort out billing."
        }`}
      />
    );
  }

  const banners = [];
  if (organization.isDemo) {
    banners.push(
      <Banner
        key="demo"
        tone="info"
        title="Demo company"
        message="This is a shared demo with sample data. Some actions are turned off and everything resets every night."
      />,
    );
  }
  if (organization.billingStatus === "trial" && organization.trialEndsAt && !organization.isDemo) {
    const days = daysUntil(organization.trialEndsAt);
    if (days <= 7) {
      banners.push(
        <Banner
          key="trial"
          tone="warning"
          title="Free trial"
          message={days <= 0 ? "Your free trial ends today." : `Your free trial ends in ${days} day${days === 1 ? "" : "s"}.`}
        />,
      );
    }
  }
  if (!user.emailVerified) {
    banners.push(
      <Banner
        key="verify"
        tone="warning"
        title="Confirm your email"
        message={`We sent a link to ${user.email}. Open it to confirm your address.`}
      />,
    );
  }
  if (organization.setupPending && user.role === "owner") {
    banners.push(
      <Banner
        key="setup"
        tone="info"
        title="Finish setting up"
        message="Add your company details and invite your team from the website's setup page."
      />,
    );
  }
  return <>{banners}</>;
}
