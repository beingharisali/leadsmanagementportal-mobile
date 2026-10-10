import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { LeadForm } from "@/features/leads/components/lead-form";
import { useLead, useUpdateLead } from "@/features/leads/hooks";

export default function EditLeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = useLead(id);
  const update = useUpdateLead(id);

  if (lead.isPending) return <LoadingView />;
  if (!lead.data) return <ErrorView error={lead.error} onRetry={() => void lead.refetch()} />;

  return (
    <Screen>
      <LeadForm
        lead={lead.data}
        submitLabel="Save changes"
        onSubmit={async (payload) => {
          await update.mutateAsync(payload);
          router.back();
        }}
      />
    </Screen>
  );
}
