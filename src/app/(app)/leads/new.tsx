import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { LeadForm } from "@/features/leads/components/lead-form";
import { useCreateLead } from "@/features/leads/hooks";
import { isManagerRole } from "@/features/users/types";

/** Add a lead. Agents' leads are always theirs; managers pick who gets it (or nobody). */
export default function NewLeadScreen() {
  const user = useCurrentUser();
  const create = useCreateLead();
  const manager = isManagerRole(user.role);

  return (
    <Screen>
      <LeadForm
        submitLabel="Add lead"
        chooseAssignee={manager}
        onSubmit={async (payload) => {
          const lead = await create.mutateAsync(payload);
          router.replace({ pathname: "/leads/[id]", params: { id: lead.id } });
        }}
      />
    </Screen>
  );
}
