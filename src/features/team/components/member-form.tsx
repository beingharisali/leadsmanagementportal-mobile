import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import type { UserPayload } from "@/features/users/hooks";
import { ASSIGNABLE_ROLES, passwordProblem, userRoleLabels, type AssignableRole, type User } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

interface MemberFormProps {
  /** Editing this person; otherwise adding someone new */
  user?: User;
  onSubmit: (payload: UserPayload) => Promise<unknown>;
}

/**
 * Add a team member with a password you share with them, or edit someone's
 * details and set a new password. The owner's role is fixed.
 */
export function MemberForm({ user, onSubmit }: MemberFormProps) {
  const editing = !!user;
  const isOwner = user?.role === "owner";
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<AssignableRole>(user && user.role !== "owner" ? user.role : "agent");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email";
    if (!editing || password) {
      const problem = passwordProblem(password);
      if (problem) found.password = problem;
    }
    return found;
  }

  async function submit() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        ...(!isOwner && { role }),
        ...(password && { password }),
      });
    } catch (error) {
      const apiErrors =
        error instanceof ApiClientError && error.errors
          ? Object.fromEntries(error.errors.map((e) => [e.path, e.message]))
          : {};
      setErrors(apiErrors);
      Alert.alert(editing ? "Couldn't save the changes" : "Couldn't add them", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <TextField label="Full name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" maxLength={100} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          placeholder="0300 1234567"
          maxLength={30}
        />
        <View style={styles.group}>
          <AppText variant="label">Role</AppText>
          {isOwner ? (
            <Badge label={userRoleLabels.owner} color="indigo" />
          ) : (
            <View style={styles.chips}>
              {ASSIGNABLE_ROLES.map((r) => (
                <Chip key={r} label={userRoleLabels[r]} selected={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
          )}
        </View>
        <TextField
          label={editing ? "New password" : "Password"}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          password
          autoComplete="new-password"
          hint={
            editing
              ? "Leave empty to keep the current password. Changing it signs them out everywhere."
              : "At least 8 characters with a letter and a number. Share it with them securely."
          }
        />
      </Card>
      <Button title={editing ? "Save changes" : "Add member"} icon="checkmark" loading={saving} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm },
});
