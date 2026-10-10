import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useCreateInvitation } from "@/features/invitations/hooks";
import { ASSIGNABLE_ROLES, userRoleLabels, type AssignableRole } from "@/features/users/types";
import { ApiClientError, fieldError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
}

export function InviteSheet(props: InviteSheetProps) {
  return <InviteSheetBody key={useOpenKey(props.open)} {...props} />;
}

/**
 * Emails someone a link to join (it expires). Owners who signed up confirm
 * their own email first, so invitations come from a real address.
 */
function InviteSheetBody({ open, onClose }: InviteSheetProps) {
  const user = useCurrentUser();
  const invite = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AssignableRole>("agent");
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  function send() {
    const to = email.trim().toLowerCase();
    invite.mutate(
      { email: to, role, ...(name.trim() && { name: name.trim() }) },
      {
        onSuccess: () => {
          onClose();
          Alert.alert("Invitation sent", `${to} gets an email with a link to join. It shows under Pending invitations until they accept.`);
        },
        onError: (error) => {
          // 502: saved, but the email didn't go out. It's in the list with "Resend".
          if (error instanceof ApiClientError && error.status === 502) {
            onClose();
            Alert.alert("Invitation saved, email not sent", error.message);
            return;
          }
          if (!fieldError(error, "email")) Alert.alert("Couldn't send the invitation", getErrorMessage(error));
        },
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Invite by email"
      subtitle="They get a link to set their own password and join."
      footer={
        user.emailVerified ? (
          <Button title="Send invitation" icon="send" loading={invite.isPending} disabled={!validEmail} onPress={send} />
        ) : undefined
      }
    >
      {!user.emailVerified ? (
        <Banner
          tone="warning"
          title="Confirm your email first"
          message="Open the confirmation link we emailed you when you signed up, then come back to invite your team."
        />
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="agent@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldError(invite.error, "email")}
          />
          <TextField label="Name (optional)" value={name} onChangeText={setName} autoCapitalize="words" maxLength={100} />
          <View style={styles.group}>
            <AppText variant="label">Role</AppText>
            <View style={styles.chips}>
              {ASSIGNABLE_ROLES.map((r) => (
                <Chip key={r} label={userRoleLabels[r]} selected={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
            <AppText variant="small" muted>
              {role === "admin"
                ? "Admins see every lead, manage the team and see reports."
                : "Agents see and work only the leads given to them or added by them."}
            </AppText>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm },
});
