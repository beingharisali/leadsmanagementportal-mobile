import { router } from "expo-router";
import { Alert } from "react-native";

import { Screen } from "@/components/ui/screen";
import { MemberForm } from "@/features/team/components/member-form";
import { useCreateUser } from "@/features/users/hooks";

/** Add someone directly with a password (instead of inviting them by email). */
export default function NewMemberScreen() {
  const create = useCreateUser();
  return (
    <Screen>
      <MemberForm
        onSubmit={async (payload) => {
          const created = await create.mutateAsync({ ...payload, password: payload.password ?? "" });
          router.back();
          Alert.alert(`${created.name} can now sign in`, "Share their email and password with them securely.");
        }}
      />
    </Screen>
  );
}
