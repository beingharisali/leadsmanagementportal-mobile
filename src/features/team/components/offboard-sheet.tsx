import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { OptionList } from "@/components/ui/option-list";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { useAssignableUsers, useOffboardingPreview, useOffboardUser } from "@/features/users/hooks";
import type { User } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const POOL = "pool";
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

interface OffboardSheetProps {
  user: User | null;
  onClose: () => void;
  /** Delete the account for good after the handover (frees the email). */
  remove?: boolean;
}

export function OffboardSheet(props: OffboardSheetProps) {
  return <OffboardSheetBody key={useOpenKey(!!props.user)} {...props} />;
}

/**
 * One step when someone leaves: their open leads and follow-ups go to a
 * teammate (or the unassigned pool) and their account is deactivated at once.
 * With `remove`, the account is then deleted for good.
 */
function OffboardSheetBody({ user, onClose, remove = false }: OffboardSheetProps) {
  const { colors } = useTheme();
  const preview = useOffboardingPreview(user?.id);
  const users = useAssignableUsers(!!user);
  const offboard = useOffboardUser();
  const [target, setTarget] = useState(POOL);
  const others = (users.data ?? []).filter((u) => u.id !== user?.id);
  const p = preview.data;

  function confirm() {
    if (!user) return;
    offboard.mutate(
      { id: user.id, reassignTo: target === POOL ? null : target, remove },
      {
        onSuccess: (result) => {
          onClose();
          const to = target === POOL ? "the unassigned pool" : others.find((u) => u.id === target)?.name;
          Alert.alert(
            `${user.name} has been ${remove ? "deleted" : "offboarded"}`,
            result.leadsMoved > 0
              ? `${plural(result.leadsMoved, "open lead")} and ${plural(result.followUpsMoved, "follow-up")} moved to ${to}.`
              : "They had no open leads.",
          );
        },
        onError: (error) => Alert.alert(remove ? "Couldn't delete them" : "Couldn't offboard them", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={remove ? `Delete ${user?.name ?? ""} permanently?` : `Offboard ${user?.name ?? ""}?`}
      subtitle={
        remove
          ? `They're signed out everywhere and removed from your team for good. This can't be undone. Their email (${user?.email ?? ""}) is freed so you can add a new account with it. Past history keeps their name.`
          : "They're signed out everywhere right away and can't sign in again. Won and lost leads stay in their name. You can reactivate them later."
      }
      footer={
        <Button
          title={remove ? "Delete permanently" : "Offboard"}
          variant="danger"
          loading={offboard.isPending}
          disabled={preview.isPending}
          onPress={confirm}
        />
      }
    >
      <View style={[styles.summary, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {preview.isPending ? (
          <AppText muted>Checking their work…</AppText>
        ) : !p ? (
          <AppText muted>{getErrorMessage(preview.error)}</AppText>
        ) : (
          <>
            <AppText>
              <AppText weight="700">{p.openLeads}</AppText> open {p.openLeads === 1 ? "lead" : "leads"} to hand over
            </AppText>
            <AppText>
              <AppText weight="700">{p.pendingFollowUps}</AppText> pending{" "}
              {p.pendingFollowUps === 1 ? "follow-up" : "follow-ups"}, which move with their leads
            </AppText>
            {p.pendingRequests > 0 && (
              <AppText>
                <AppText weight="700">{p.pendingRequests}</AppText> handover{" "}
                {p.pendingRequests === 1 ? "request" : "requests"} will be cancelled
              </AppText>
            )}
          </>
        )}
      </View>
      <AppText variant="label">Give their open leads to</AppText>
      <OptionList
        options={[
          { value: POOL, label: "Nobody yet (unassigned pool)" },
          ...others.map((u) => ({ value: u.id, label: u.name })),
        ]}
        value={target}
        onSelect={setTarget}
      />
      <AppText variant="small" muted>
        You can split them up later from the Leads tab.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
});
