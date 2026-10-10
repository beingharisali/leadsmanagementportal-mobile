import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { useChangePassword, useUpdateProfile } from "@/features/account/hooks";
import { useAuth, useCurrentUser } from "@/features/auth/auth-provider";
import { useSupportSwitch } from "@/features/platform/support-switch";
import { NotificationSettingsCard } from "@/features/push/notification-settings";
import { passwordProblem, userRoleLabels } from "@/features/users/types";
import { ApiClientError, fieldError, getErrorMessage } from "@/lib/api-client";
import { getInitials } from "@/lib/format";
import { useViewAsTarget } from "@/lib/view-as";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** Your profile and password (Settings → General on the website), and signing out. */
export default function AccountScreen() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const support = useSupportSwitch();
  const { colors } = useTheme();
  const viewingAs = useViewAsTarget();
  const [signingOut, setSigningOut] = useState(false);
  // Not while a manager is viewing as an agent, or during a support session: it's not their account.
  const editable = !viewingAs && !user.support;

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
        <Badge label={userRoleLabels[user.role]} color="indigo" />
      </View>

      {editable && <ProfileCard key={`${user.name}|${user.phone ?? ""}`} />}
      {editable && <PasswordCard />}
      {editable && <NotificationSettingsCard />}

      <Button
        title="Sign out"
        variant="secondary"
        icon="log-out-outline"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          // In a support session, signing out ends it and goes back to the staff account.
          void (user.support ? support.exit() : signOut());
        }}
      />
    </Screen>
  );
}

function ProfileCard() {
  const user = useCurrentUser();
  const update = useUpdateProfile();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const dirty = name.trim() !== user.name || phone.trim() !== (user.phone ?? "");

  function save() {
    if (name.trim().length < 2) return Alert.alert("Enter your name", "At least 2 characters.");
    update.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: () => Alert.alert("Profile saved"),
        onError: (error) => Alert.alert("Couldn't save your profile", getErrorMessage(error)),
      },
    );
  }

  return (
    <Card>
      <AppText variant="heading">Profile</AppText>
      <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={100} />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} />
      <AppText variant="small" muted>
        Your email can be changed by your company&apos;s owner or an admin.
      </AppText>
      <Button title="Save changes" loading={update.isPending} disabled={!dirty} onPress={save} />
    </Card>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const found: Record<string, string> = {};
    if (!current) found.currentPassword = "Enter your current password";
    const problem = passwordProblem(next);
    if (problem) found.newPassword = problem;
    if (next !== confirm) found.confirm = "Passwords don't match";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent("");
          setNext("");
          setConfirm("");
          Alert.alert("Password changed", "Your other devices have been signed out.");
        },
        onError: (error) => {
          const fromApi = {
            currentPassword: fieldError(error, "currentPassword"),
            newPassword: fieldError(error, "newPassword"),
          };
          if (fromApi.currentPassword || fromApi.newPassword) {
            setErrors(Object.fromEntries(Object.entries(fromApi).filter(([, v]) => v)) as Record<string, string>);
          } else if (error instanceof ApiClientError && error.status === 400) {
            setErrors({ currentPassword: error.message });
          } else Alert.alert("Couldn't change your password", getErrorMessage(error));
        },
      },
    );
  }

  return (
    <Card>
      <AppText variant="heading">Password</AppText>
      <AppText variant="small" muted>
        Changing it signs you out on all your other devices.
      </AppText>
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        password
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <TextField
        label="New password"
        value={next}
        onChangeText={setNext}
        password
        autoComplete="new-password"
        error={errors.newPassword}
        hint="At least 8 characters with a letter and a number."
      />
      <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} password error={errors.confirm} />
      <Button title="Change password" loading={change.isPending} disabled={!current || !next} onPress={submit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
});
