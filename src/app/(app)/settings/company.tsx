import { Screen } from "@/components/ui/screen";
import { EmptyView } from "@/components/ui/state-views";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { DetailsCard, LogoCard, PlanLine, toDetails } from "@/features/organizations/components/company-cards";

/** Owner: the company's name, details and logo, shown to everyone on the team. */
export default function CompanyScreen() {
  const user = useCurrentUser();
  const organization = user.organization;
  if (user.role !== "owner" || !organization) {
    return <EmptyView icon="lock-closed-outline" title="Only the owner can change the company details" />;
  }
  return (
    <Screen>
      <LogoCard organization={organization} />
      <DetailsCard key={JSON.stringify(toDetails(organization))} organization={organization} />
      <PlanLine organization={organization} />
    </Screen>
  );
}
