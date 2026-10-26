import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { useLeadOptions } from "@/features/customization/hooks";
import {
  useDeleteDepartment,
  useDepartment,
  useDepartmentPeople,
  useMoveToDepartment,
  useUpdateDepartment,
} from "@/features/departments/hooks";
import type { DepartmentDetail } from "@/features/departments/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { PeopleField } from "@/features/tasks/components/people-field";
import { useTaskAccess } from "@/features/tasks/hooks";
import { formatShift, isEmptyShift, ShiftFields } from "@/features/team/components/shift-fields";
import { userRoleLabels, type UserShift } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

/** A department's people; those who manage departments can edit it and move people in. */
export default function DepartmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const canEdit = useCanEdit();
  const access = useTaskAccess();
  const department = useDepartment(id);
  const canManage = canEdit && Boolean(access.data?.canManageDepartments);
  const people = useDepartmentPeople(canManage);
  const move = useMoveToDepartment();
  const remove = useDeleteDepartment();
  const [adding, setAdding] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const data = department.data;

  useLayoutEffect(() => {
    function showActions() {
      if (!data) return;
      Alert.alert(data.name, undefined, [
        { text: "Edit", onPress: () => setEditing(true) },
        ...(!data.kind
          ? [
              {
                text: "Delete",
                style: "destructive" as const,
                onPress: () =>
                  Alert.alert(`Delete ${data.name}?`, "Everyone in it moves to General Team. Their tasks stay as they are.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        remove.mutate(id, {
                          onSuccess: () => router.back(),
                          onError: (e) => Alert.alert("Couldn't delete it", getErrorMessage(e)),
                        }),
                    },
                  ]),
              },
            ]
          : []),
        { text: "Close", style: "cancel" as const },
      ]);
    }
    navigation.setOptions({
      title: data?.name ?? "",
      headerRight: canManage && data ? () => <HeaderButton label="Actions" icon="ellipsis-horizontal" onPress={showActions} /> : undefined,
    });
  }, [navigation, data, canManage, id, remove]);

  if (department.isPending) return <LoadingView />;
  if (!data) return <ErrorView error={department.error} onRetry={() => void department.refetch()} />;

  const others = (people.data ?? []).filter((p) => p.department !== id);

  return (
    <Screen onRefresh={() => department.refetch()}>
      <AppText muted>
        {data.description || `${data.memberCount} ${data.memberCount === 1 ? "person" : "people"}`} · Head: {data.head?.name ?? "nobody"}
      </AppText>
      {data.shift && <AppText muted>Working hours: {formatShift(data.shift)}</AppText>}
      <Card>
        {data.members.length === 0 ? (
          <AppText muted>Nobody in this department yet.</AppText>
        ) : (
          data.members.map((m) => (
            <View key={m.id} style={styles.person}>
              <View style={styles.flex}>
                <AppText>{m.name}</AppText>
                <AppText variant="small" muted>
                  {m.email}
                </AppText>
              </View>
              <Badge label={data.head?.id === m.id ? "Head" : userRoleLabels[m.role]} color={data.head?.id === m.id ? "indigo" : "slate"} />
            </View>
          ))
        )}
      </Card>
      {canManage && (
        <Card>
          <PeopleField
            label="Move people here"
            options={others}
            value={adding}
            onChange={setAdding}
            loading={people.isPending}
            placeholder="Pick people from other departments"
          />
          <Button
            title={`Move to ${data.name}`}
            icon="person-add-outline"
            disabled={adding.length === 0}
            loading={move.isPending}
            onPress={() =>
              move.mutate(
                { id, userIds: adding },
                { onSuccess: () => setAdding([]), onError: (e) => Alert.alert("Couldn't move them", getErrorMessage(e)) },
              )
            }
          />
        </Card>
      )}
      <EditSheet department={data} open={editing} onClose={() => setEditing(false)} />
    </Screen>
  );
}

function EditSheet({ department, open, onClose }: { department: DepartmentDetail; open: boolean; onClose: () => void }) {
  const update = useUpdateDepartment();
  const people = useDepartmentPeople(open);
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description ?? "");
  const [head, setHead] = useState<string[]>(department.head ? [department.head.id] : []);
  const { colors } = useTheme();
  const { tracking } = useLeadOptions();
  const company: UserShift = { start: tracking.shiftStart, end: tracking.shiftEnd, workDays: tracking.workDays };
  const [ownHours, setOwnHours] = useState(Boolean(department.shift));
  const [shift, setShift] = useState<UserShift>(department.shift ?? company);

  function save() {
    if (name.trim().length < 2) return Alert.alert("Give the department a name");
    if (ownHours && isEmptyShift(shift)) return Alert.alert("The shift must end at a different time");
    update.mutate(
      {
        id: department.id,
        payload: {
          ...(!department.kind && { name: name.trim() }),
          description: description.trim() || null,
          head: head[0] ?? null,
          shift: ownHours ? shift : null,
        },
      },
      { onSuccess: onClose, onError: (error) => Alert.alert("Couldn't save it", getErrorMessage(error)) },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit department"
      footer={<Button title="Save" icon="checkmark" loading={update.isPending} onPress={save} />}
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        editable={!department.kind}
        hint={department.kind ? "Built-in departments keep their name." : undefined}
        maxLength={60}
      />
      <TextField label="Description" value={description} onChangeText={setDescription} maxLength={300} />
      <PeopleField
        label="Head"
        single
        placeholder="Nobody"
        options={(people.data ?? []).filter((p) => p.canHead)}
        value={head}
        onChange={setHead}
        loading={people.isPending}
      />
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Own working hours</AppText>
          <AppText variant="small" muted>
            For its people who don&apos;t have their own hours. Off: the company shift, {formatShift(company)}.
          </AppText>
        </View>
        <Switch value={ownHours} onValueChange={setOwnHours} trackColor={{ true: colors.primary }} accessibilityLabel="Own working hours" />
      </View>
      {ownHours && <ShiftFields shift={shift} onChange={setShift} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
