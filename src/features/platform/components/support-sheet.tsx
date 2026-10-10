import { useState } from "react";
import { Alert } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { OptionList } from "@/components/ui/option-list";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { userRoleLabels } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";

import type { PlatformOrganizationDetail } from "../hooks";
import { useSupportSwitch } from "../support-switch";

interface SupportSheetProps {
  organization: PlatformOrganizationDetail;
  open: boolean;
  onClose: () => void;
}

export function SupportSheet(props: SupportSheetProps) {
  return <SupportSheetBody key={useOpenKey(props.open)} {...props} />;
}

/** Sign in as one of the company's owner/admins, read-only, for up to an hour. Logged with the reason. */
function SupportSheetBody({ organization, open, onClose }: SupportSheetProps) {
  const support = useSupportSwitch();
  const users = organization.admins.filter((a) => a.isActive);
  const [userId, setUserId] = useState(users.find((u) => u.role === "owner")?.id ?? users[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [starting, setStarting] = useState(false);

  async function submit() {
    if (reason.trim().length < 5) return Alert.alert("Add a reason", "Say why you need to sign in; the company sees it.");
    setStarting(true);
    try {
      await support.start({ organizationId: organization.id, userId: userId || undefined, reason: reason.trim() });
    } catch (error) {
      setStarting(false);
      Alert.alert("Couldn't sign in as them", getErrorMessage(error));
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Sign in as a ${organization.name} user`}
      subtitle="You'll see their workspace exactly as they do, read-only, for up to an hour. It's recorded in the support log and shown in the company's own history with your reason."
      footer={
        <Button title="Sign in" icon="log-in-outline" loading={starting} disabled={users.length === 0} onPress={() => void submit()} />
      }
    >
      <AppText variant="label">User</AppText>
      {users.length === 0 ? (
        <AppText muted>This company has no active owner or admin to sign in as.</AppText>
      ) : (
        <OptionList
          options={users.map((u) => ({ value: u.id, label: `${u.name} · ${userRoleLabels[u.role]}` }))}
          value={userId}
          onSelect={setUserId}
        />
      )}
      <TextField
        label="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={300}
        placeholder="e.g. Customer asked for help importing their leads"
      />
    </Sheet>
  );
}
