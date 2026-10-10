import { useState } from "react";

import { AppText } from "@/components/ui/app-text";
import { OptionList } from "@/components/ui/option-list";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/api-client";

import { useAssignableUsers } from "../hooks";
import { userRoleLabels } from "../types";

/** The "Unassigned" choice's value. */
export const UNASSIGNED = "unassigned";

interface UserPickerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Current choice: a user id, or `UNASSIGNED` */
  value: string | null;
  onSelect: (userId: string | null) => void;
  busy?: boolean;
}

/** Managers: pick a team member (or nobody) to give a lead to. */
export function UserPickerSheet({ open, onClose, title, subtitle, value, onSelect, busy }: UserPickerSheetProps) {
  const users = useAssignableUsers(open);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const list = (users.data ?? []).filter((u) => !query || u.name.toLowerCase().includes(query));

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {(users.data?.length ?? 0) > 8 && <SearchField value={search} onChangeText={setSearch} placeholder="Search people" />}
      {busy && (
        <AppText variant="small" muted>
          Saving…
        </AppText>
      )}
      {users.isPending ? (
        <AppText muted>Loading the team…</AppText>
      ) : users.error ? (
        <AppText muted>{getErrorMessage(users.error)}</AppText>
      ) : (
        <OptionList
          options={[
            ...(query ? [] : [{ value: UNASSIGNED, label: "Nobody (unassigned)" }]),
            ...list.map((u) => ({ value: u.id, label: `${u.name} · ${userRoleLabels[u.role]}` })),
          ]}
          value={value}
          onSelect={(selected) => !busy && onSelect(selected === UNASSIGNED ? null : selected)}
        />
      )}
    </Sheet>
  );
}
