import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { MemberForm } from "@/features/team/components/member-form";
import { useUpdateUser, useUser } from "@/features/users/hooks";

/** Edit a team member's details, role or password. */
export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser(id);
  const update = useUpdateUser();

  if (user.isPending) return <LoadingView />;
  if (!user.data) return <ErrorView error={user.error} onRetry={() => void user.refetch()} />;

  return (
    <Screen>
      <MemberForm
        user={user.data}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id, payload });
          router.back();
        }}
      />
    </Screen>
  );
}
