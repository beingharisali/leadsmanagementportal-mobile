import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { PLAN_KEYS, planLabels, type PlanKey } from "@/features/plans/types";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { announcementLevelLabels, endOfDayIso, useCreateAnnouncement, type AnnouncementLevel } from "../hooks";
import { OptionalDateField } from "./optional-date-field";

const LEVELS = Object.keys(announcementLevelLabels) as AnnouncementLevel[];

interface AnnouncementSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AnnouncementSheet(props: AnnouncementSheetProps) {
  return <AnnouncementSheetBody key={useOpenKey(props.open)} {...props} />;
}

/** A banner at the top of every workspace it's for (all companies, or some plans), until each user closes it. */
function AnnouncementSheetBody({ open, onClose }: AnnouncementSheetProps) {
  const { colors } = useTheme();
  const create = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("info");
  const [plans, setPlans] = useState<PlanKey[]>([]);
  const [endsOn, setEndsOn] = useState<Date | null>(null);
  const [sendEmail, setSendEmail] = useState(false);

  function togglePlan(plan: PlanKey) {
    setPlans((list) => (list.includes(plan) ? list.filter((p) => p !== plan) : [...list, plan]));
  }

  function submit() {
    if (title.trim().length < 3 || body.trim().length < 3) return Alert.alert("Add a title and a message");
    create.mutate(
      { title: title.trim(), body: body.trim(), level, plans, endsAt: endsOn ? endOfDayIso(endsOn) : undefined, sendEmail },
      {
        onSuccess: () => {
          onClose();
          Alert.alert(sendEmail ? "Published; emails are on their way" : "Published");
        },
        onError: (error) => Alert.alert("Couldn't publish it", getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New announcement"
      subtitle="Shown as a banner at the top of every workspace it's for, until each user closes it."
      footer={<Button title="Publish" icon="megaphone-outline" loading={create.isPending} onPress={submit} />}
    >
      <TextField label="Title" value={title} onChangeText={setTitle} maxLength={120} />
      <TextField label="Message" value={body} onChangeText={setBody} multiline maxLength={2000} />
      <View style={styles.group}>
        <AppText variant="label">Type</AppText>
        <View style={styles.chips}>
          {LEVELS.map((l) => (
            <Chip key={l} label={announcementLevelLabels[l]} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <AppText variant="label">Companies</AppText>
        <View style={styles.chips}>
          {PLAN_KEYS.map((p) => (
            <Chip key={p} label={planLabels[p]} selected={plans.includes(p)} icon={plans.includes(p) ? "checkmark" : undefined} onPress={() => togglePlan(p)} />
          ))}
        </View>
        <AppText variant="small" muted>
          {plans.length === 0 ? "Every company." : "Only companies on the ticked plans."}
        </AppText>
      </View>
      <OptionalDateField label="Show until (optional)" value={endsOn} onChange={setEndsOn} hint="Empty = until you end it." />
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Also email owners and admins</AppText>
          <AppText variant="small" muted>
            One email each, sent now.
          </AppText>
        </View>
        <Switch
          value={sendEmail}
          onValueChange={setSendEmail}
          trackColor={{ true: colors.primary }}
          accessibilityLabel="Also email owners and admins"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: { gap: spacing.xs + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
