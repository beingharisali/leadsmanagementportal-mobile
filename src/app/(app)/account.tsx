import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useAuth, useCurrentUser } from "@/features/auth/auth-provider";
import { planLabels } from "@/features/plans/types";
import { userRoleLabels } from "@/features/users/types";
import { getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="small" muted>
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

export default function AccountScreen() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const organization = user.organization;

  return (
    <Screen>
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="heading" color={colors.primary}>
            {getInitials(user.name)}
          </AppText>
        </View>
        <AppText variant="heading">{user.name}</AppText>
        <AppText muted>{user.email}</AppText>
      </View>

      <Card>
        <Field label="Role" value={userRoleLabels[user.role]} />
        {user.phone && <Field label="Phone" value={user.phone} />}
        {organization && <Field label="Company" value={organization.name} />}
        {organization && <Field label="Plan" value={planLabels[organization.plan]} />}
      </Card>

      <AppText variant="small" muted>
        To change your name, phone or password, use Settings on the website for now.
      </AppText>

      <Button
        title="Sign out"
        variant="secondary"
        icon="log-out-outline"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  field: { gap: 2, paddingVertical: spacing.xs },
});
