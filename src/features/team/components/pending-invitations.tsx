import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isInvitationExpired, useInvitations, useResendInvitation, useRevokeInvitation, type Invitation } from "@/features/invitations/hooks";
import { useRoleLabel } from "@/features/member-roles/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Invitations waiting to be accepted, with resend and withdraw. Hidden when there are none. */
export function PendingInvitations({ canWrite }: { canWrite: boolean }) {
  const { colors } = useTheme();
  const invitations = useInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const now = useNow();
  const roleLabel = useRoleLabel();
  const list = invitations.data ?? [];
  if (list.length === 0) return null;

  function showActions(invitation: Invitation) {
    if (!canWrite) return;
    Alert.alert(invitation.email, undefined, [
      {
        text: "Send again",
        onPress: () =>
          resend.mutate(invitation.id, {
            onSuccess: () => Alert.alert("Invitation sent again", `A fresh link went to ${invitation.email}.`),
            onError: (error) => Alert.alert("Couldn't send it", getErrorMessage(error)),
          }),
      },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: () =>
          revoke.mutate(invitation.id, {
            onError: (error) => Alert.alert("Couldn't withdraw it", getErrorMessage(error)),
          }),
      },
      { text: "Close", style: "cancel" },
    ]);
  }

  return (
    <Card>
      <AppText variant="heading">Pending invitations</AppText>
      <AppText variant="small" muted>
        People who haven&apos;t accepted yet. Tap one to send it again or withdraw it.
      </AppText>
      {list.map((invitation, index) => {
        const expired = isInvitationExpired(invitation, now.getTime());
        return (
          <Pressable
            key={invitation.id}
            accessibilityRole="button"
            onPress={() => showActions(invitation)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.primarySoft },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={16} color={colors.mutedText} />
            </View>
            <View style={styles.flex}>
              <AppText numberOfLines={1}>
                {invitation.name ? `${invitation.name} · ` : ""}
                {invitation.email}
              </AppText>
              <AppText variant="small" muted>
                {expired
                  ? `Expired ${formatDate(invitation.expiresAt)}`
                  : `Sent ${formatDate(invitation.sentAt)}${invitation.invitedBy ? ` by ${invitation.invitedBy.name}` : ""} · expires ${formatDate(invitation.expiresAt)}`}
              </AppText>
            </View>
            <View style={styles.badges}>
              <Badge label={roleLabel(invitation)} color={invitation.role === "admin" ? "indigo" : "slate"} />
              {expired && <Badge label="Expired" color="rose" />}
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  icon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  badges: { alignItems: "flex-end", gap: spacing.xs },
});
