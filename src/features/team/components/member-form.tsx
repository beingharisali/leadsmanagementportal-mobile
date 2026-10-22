import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { useDepartments } from "@/features/departments/hooks";
import { useHasFeature } from "@/features/plans/hooks";
import { useCreateMemberRole, useMemberRoles } from "@/features/member-roles/hooks";
import type { UserPayload } from "@/features/users/hooks";
import { hasTeamAccess, passwordProblem, userRoleLabels, type AssignableRole, type User } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const MEMBER_PREFIX = "member:";

/** The picker's value: "admin", "agent", "member:<custom role id>", or "" when nothing is picked. */
function roleChoiceOf(user?: User) {
  if (!user || user.role === "owner") return "";
  if (user.role === "member") return user.memberRole ? `${MEMBER_PREFIX}${user.memberRole}` : "";
  return user.role;
}

function parseRoleChoice(choice: string): { role: AssignableRole; memberRole: string | null } {
  if (choice.startsWith(MEMBER_PREFIX)) return { role: "member", memberRole: choice.slice(MEMBER_PREFIX.length) };
  return { role: choice as AssignableRole, memberRole: null };
}

interface MemberFormProps {
  /** Editing this person; otherwise adding someone new */
  user?: User;
  onSubmit: (payload: UserPayload) => Promise<unknown>;
}

/**
 * Add a team member with a password you share with them, or edit someone's
 * details and set a new password. The owner's role is fixed. A new person's
 * role is always picked (no default): Admin, Agent, or a custom role.
 */
export function MemberForm({ user, onSubmit }: MemberFormProps) {
  const editing = !!user;
  const isOwner = user?.role === "owner";
  const { colors } = useTheme();
  const me = useCurrentUser();
  const meIsOwner = me.role === "owner";
  const canCreateRole = hasTeamAccess(me);
  const roles = useMemberRoles();
  const createRole = useCreateMemberRole();
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [canManageTeam, setCanManageTeam] = useState(Boolean(user?.canManageTeam));
  // Departments and the task switches come with Work management (paid Business).
  const hasWork = useHasFeature("workManagement");
  const departments = useDepartments(!isOwner);
  // "" = the default for the role (Sales for agents, General Team for others).
  const [department, setDepartment] = useState(user?.department ?? "");
  const [canAssignTasks, setCanAssignTasks] = useState(Boolean(user?.canAssignTasks));
  const [canManageDepartments, setCanManageDepartments] = useState(Boolean(user?.canManageDepartments));
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState(roleChoiceOf(user));
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Name is required";
    if (!isOwner && !role) found.role = "Pick a role";
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
      const picked = parseRoleChoice(role);
      // Only the owner gives admins team access; it's left alone otherwise.
      const access = {
        ...(meIsOwner && picked.role === "admin" && { canManageTeam }),
        // Only the owner lets admins and members give tasks or manage departments.
        ...(hasWork && meIsOwner && (picked.role === "admin" || picked.role === "member") && { canAssignTasks, canManageDepartments }),
        ...(department && { department }),
      };
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        ...(!isOwner && { role: picked.role, memberRole: picked.memberRole, ...access }),
        ...(password && { password }),
      });
    } catch (error) {
      const apiErrors =
        error instanceof ApiClientError && error.errors
          ? Object.fromEntries(error.errors.map((e) => [e.path, e.message]))
          : {};
      // A missing custom role comes back on `memberRole`; it's the role picker here.
      if (apiErrors.memberRole) apiErrors.role = apiErrors.memberRole;
      setErrors(apiErrors);
      Alert.alert(editing ? "Couldn't save the changes" : "Couldn't add them", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function addRole() {
    const trimmed = newRole.trim();
    if (trimmed.length < 2) return Alert.alert("Give the role a name");
    createRole.mutate(trimmed, {
      onSuccess: (created) => {
        setRole(`${MEMBER_PREFIX}${created.id}`);
        setAddingRole(false);
        setNewRole("");
      },
      onError: (error) => Alert.alert("Couldn't add the role", getErrorMessage(error)),
    });
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
            <>
              <AppText variant="small" muted>
                Works leads
              </AppText>
              <View style={styles.chips}>
                <Chip label={userRoleLabels.admin} selected={role === "admin"} onPress={() => setRole("admin")} />
                <Chip label={userRoleLabels.agent} selected={role === "agent"} onPress={() => setRole("agent")} />
              </View>
              <AppText variant="small" muted>
                Team roles
              </AppText>
              <View style={styles.chips}>
                {(roles.data ?? []).map((r) => (
                  <Chip
                    key={r.id}
                    label={r.name}
                    selected={role === `${MEMBER_PREFIX}${r.id}`}
                    onPress={() => setRole(`${MEMBER_PREFIX}${r.id}`)}
                  />
                ))}
                {canCreateRole && !addingRole && (
                  <Chip label="New role" icon="add" onPress={() => setAddingRole(true)} />
                )}
              </View>
              {roles.isPending && (
                <AppText variant="small" muted>
                  Loading roles…
                </AppText>
              )}
              {addingRole && (
                <View style={styles.newRole}>
                  <View style={styles.flex}>
                    <TextField
                      label="New role name"
                      value={newRole}
                      onChangeText={setNewRole}
                      placeholder="e.g. Developer"
                      autoCapitalize="words"
                      maxLength={60}
                      autoFocus
                    />
                  </View>
                  <Button title="Add" loading={createRole.isPending} onPress={addRole} />
                  <Button title="Cancel" variant="ghost" onPress={() => setAddingRole(false)} />
                </View>
              )}
              {errors.role && (
                <AppText variant="small" color={colors.danger}>
                  {errors.role}
                </AppText>
              )}
            </>
          )}
        </View>
        {!isOwner && hasWork && (
          <View style={styles.group}>
            <AppText variant="label">Department</AppText>
            <View style={styles.chips}>
              {!user?.department && (
                <Chip label="Default" selected={department === ""} onPress={() => setDepartment("")} />
              )}
              {(departments.data ?? []).map((d) => (
                <Chip key={d.id} label={d.name} selected={department === d.id} onPress={() => setDepartment(d.id)} />
              ))}
            </View>
            <AppText variant="small" muted>
              {department === "" ? "Agents start in Sales, everyone else in General Team. " : ""}Agents in Sales work leads; people in
              other departments get tasks.
            </AppText>
          </View>
        )}
        {hasWork && meIsOwner && (role === "admin" || role.startsWith(MEMBER_PREFIX)) && (
          <>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <AppText variant="label">Can give tasks</AppText>
                <AppText variant="small" muted>
                  Give tasks to people in their own department and create projects.
                </AppText>
              </View>
              <Switch value={canAssignTasks} onValueChange={setCanAssignTasks} accessibilityLabel="Can give tasks" />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <AppText variant="label">Can manage departments</AppText>
                <AppText variant="small" muted>
                  Create, edit and delete departments, pick heads and move people.
                </AppText>
              </View>
              <Switch
                value={canManageDepartments}
                onValueChange={setCanManageDepartments}
                accessibilityLabel="Can manage departments"
              />
            </View>
          </>
        )}
        {meIsOwner && role === "admin" && (
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <AppText variant="label">Team access</AppText>
              <AppText variant="small" muted>
                Let this admin add and invite people, and create, rename or delete custom roles.
              </AppText>
            </View>
            <Switch value={canManageTeam} onValueChange={setCanManageTeam} accessibilityLabel="Team access" />
          </View>
        )}
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
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  newRole: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
