import { useState } from "react";
import { Alert } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { getErrorMessage } from "@/lib/api-client";

import { useDeleteOrganization, type PlatformOrganizationDetail } from "../hooks";

interface DeleteCompanySheetProps {
  organization: PlatformOrganizationDetail;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteCompanySheet(props: DeleteCompanySheetProps) {
  return <DeleteCompanySheetBody key={useOpenKey(props.open)} {...props} />;
}

/** Deletes a company and everything in it for good. Typing its name is the confirmation. */
function DeleteCompanySheetBody({ organization, open, onClose, onDeleted }: DeleteCompanySheetProps) {
  const remove = useDeleteOrganization();
  const [confirmName, setConfirmName] = useState("");
  const matches = confirmName.trim().toLowerCase() === organization.name.trim().toLowerCase();
  const { users, leads } = organization.usage;

  function submit() {
    if (!matches) return;
    remove.mutate(
      { id: organization.id, confirmName },
      {
        onSuccess: () => {
          onClose();
          onDeleted();
          Alert.alert(`${organization.name} has been deleted`);
        },
        onError: (error) => Alert.alert("Couldn't delete the company", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Delete ${organization.name} permanently?`}
      subtitle={`Everything in this company is removed for good: its ${users} ${users === 1 ? "user" : "users"}, ${leads} ${leads === 1 ? "lead" : "leads"}, history, invoices, payments and files. Everyone is signed out and their emails can be used again. This can't be undone.`}
      footer={
        <Button
          title="Delete permanently"
          variant="danger"
          icon="trash-outline"
          loading={remove.isPending}
          disabled={!matches}
          onPress={submit}
        />
      }
    >
      <TextField
        label="Type the company name to confirm"
        value={confirmName}
        onChangeText={setConfirmName}
        placeholder={organization.name}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AppText variant="small" muted>
        To keep their data instead, suspend the company.
      </AppText>
    </Sheet>
  );
}
