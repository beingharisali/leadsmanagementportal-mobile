import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeaderButton } from "@/components/ui/header-button";
import { OptionList } from "@/components/ui/option-list";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { EmptyView, ErrorView, LoadingView } from "@/components/ui/state-views";
import { TextField } from "@/components/ui/text-field";
import { ActivityItem } from "@/features/activities/components/activity-item";
import { AttachmentsCard } from "@/features/attachments/components/attachments-card";
import { attachmentKeys } from "@/features/attachments/hooks";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { LogCallSheet } from "@/features/calls/components/log-call-sheet";
import { CommentThread } from "@/features/comments/components/comment-thread";
import { formatCustomFieldValue, useLeadOptions } from "@/features/customization/hooks";
import { LOST_STAGE } from "@/features/customization/types";
import { FollowUpRow } from "@/features/follow-ups/components/follow-up-row";
import { ScheduleSheet } from "@/features/follow-ups/components/schedule-sheet";
import { useFollowUpActions } from "@/features/follow-ups/components/use-follow-up-actions";
import { useFollowUps } from "@/features/follow-ups/hooks";
import { leadRatingLabels, leadTimelineLabels } from "@/features/leads/config";
import { RatingBadge, StageBadge } from "@/features/leads/components/lead-badges";
import { MessageSheet } from "@/features/leads/components/message-sheet";
import { LeadViewsCard } from "@/features/leads/components/lead-views-card";
import { OwnerCard } from "@/features/leads/components/owner-card";
import { StageSheet } from "@/features/leads/components/stage-sheet";
import {
  leadsApi,
  useAddNote,
  useDeleteLead,
  useLead,
  useLeadActivities,
  useSetLeadRating,
} from "@/features/leads/hooks";
import { LEAD_RATINGS, type Lead, type LeadRating } from "@/features/leads/types";
import { useCanEdit } from "@/features/organizations/hooks";
import { isManagerRole } from "@/features/users/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { flattenPages } from "@/lib/infinite";
import { formatCurrency, formatDate, formatTimeAgo, telUrl } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = useLead(id);

  // Opening a lead is recorded (managers see who looked at it and for how long).
  useEffect(() => {
    leadsApi.recordView(id).catch(() => undefined);
  }, [id]);

  if (lead.isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "" }} />
        <LoadingView />
      </Screen>
    );
  }

  if (!lead.data) {
    const notFound = lead.error instanceof ApiClientError && lead.error.status === 404;
    return (
      <Screen onRefresh={() => lead.refetch()}>
        <Stack.Screen options={{ title: "Lead" }} />
        {notFound ? (
          <EmptyView
            icon="search-outline"
            title="Lead not found"
            message="It may have been deleted or given to someone else."
          />
        ) : (
          <ErrorView error={lead.error} onRetry={() => void lead.refetch()} />
        )}
      </Screen>
    );
  }

  return <LeadDetail lead={lead.data} onRefresh={() => lead.refetch()} />;
}

function LeadDetail({ lead, onRefresh }: { lead: Lead; onRefresh: () => Promise<unknown> }) {
  const { colors } = useTheme();
  const canEdit = useCanEdit();
  const manager = isManagerRole(useCurrentUser().role);
  const deleteLead = useDeleteLead();

  function confirmDelete() {
    Alert.alert(
      "Move this lead to the recycle bin?",
      `${lead.businessName} will be hidden from every list. You can restore it from the recycle bin.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to bin",
          style: "destructive",
          onPress: () =>
            deleteLead.mutate(lead.id, {
              onSuccess: () => router.back(),
              onError: (error) => Alert.alert("Couldn't delete the lead", getErrorMessage(error)),
            }),
        },
      ],
    );
  }
  const { stageLabel, sourceLabel, customFields, needsLostReason } = useLeadOptions();
  const activities = useLeadActivities(lead.id);
  const followUps = useFollowUps({ leadId: lead.id, status: "pending", limit: 20 });
  const followUpActions = useFollowUpActions();
  const now = useNow();
  const queryClient = useQueryClient();

  const [stageOpen, setStageOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [message, setMessage] = useState<"whatsapp" | "email" | null>(null);
  const [callSheet, setCallSheet] = useState<{ startedAt?: number } | null>(null);

  const pendingFollowUps = flattenPages(followUps.data);
  const location = [lead.address, lead.city].filter(Boolean).join(", ");

  async function call() {
    try {
      await Linking.openURL(telUrl(lead.phone));
      setCallSheet({ startedAt: Date.now() });
    } catch {
      Alert.alert("Couldn't start the call", `Dial ${lead.phone} yourself, then log the call here.`);
    }
  }

  return (
    <Screen
      onRefresh={() =>
        Promise.all([
          onRefresh(),
          activities.refetch(),
          followUps.refetch(),
          queryClient.invalidateQueries({ queryKey: ["comments", lead.id] }),
          queryClient.invalidateQueries({ queryKey: attachmentKeys.list(lead.id) }),
        ])
      }
    >
      <Stack.Screen
        options={{
          title: lead.businessName,
          headerRight: canEdit
            ? () => (
                <HeaderButton
                  label="Edit"
                  onPress={() => router.push({ pathname: "/leads/[id]/edit", params: { id: lead.id } })}
                />
              )
            : undefined,
        }}
      />

      <View style={styles.header}>
        <AppText variant="title">{lead.businessName}</AppText>
        <AppText muted>
          {lead.name} · {lead.phone}
        </AppText>
        <View style={styles.badges}>
          <Pressable
            onPress={() => canEdit && setStageOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Stage: ${stageLabel(lead.status)}${canEdit ? ". Tap to change" : ""}`}
            style={styles.tappableBadge}
          >
            <StageBadge status={lead.status} />
            {canEdit && <Ionicons name="chevron-down" size={14} color={colors.mutedText} />}
          </Pressable>
          <Pressable
            onPress={() => canEdit && setRatingOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Rating: ${leadRatingLabels[lead.rating]}, score ${lead.score}`}
            style={styles.tappableBadge}
          >
            <RatingBadge rating={lead.rating} score={lead.score} />
            {canEdit && <Ionicons name="chevron-down" size={14} color={colors.mutedText} />}
          </Pressable>
        </View>
        <AppText variant="small" muted>
          {lead.lastContactedAt ? `Last contacted ${formatTimeAgo(lead.lastContactedAt)}` : "Not contacted yet"}
        </AppText>
      </View>

      <View style={styles.actions}>
        <QuickAction icon="call" label="Call" onPress={() => void call()} />
        <QuickAction icon="logo-whatsapp" label="WhatsApp" onPress={() => setMessage("whatsapp")} disabled={!canEdit} />
        <QuickAction
          icon="mail"
          label="Email"
          onPress={() => setMessage("email")}
          disabled={!lead.email || !canEdit}
        />
        <QuickAction icon="create" label="Log call" onPress={() => setCallSheet({})} disabled={!canEdit} />
      </View>

      {lead.lostReason && (lead.status === LOST_STAGE || needsLostReason(lead.status)) && (
        <Banner tone="danger" title={`${stageLabel(lead.status)} reason`} message={lead.lostReason} />
      )}

      <Card>
        <View style={styles.cardHeader}>
          <AppText variant="heading">Follow-ups</AppText>
          {canEdit && <Button title="Schedule" variant="ghost" icon="add" onPress={() => setScheduleOpen(true)} style={styles.inlineButton} />}
        </View>
        {followUps.isPending ? (
          <AppText muted>Loading…</AppText>
        ) : pendingFollowUps.length === 0 ? (
          <AppText muted>Nothing planned. Schedule the next call or meeting so it isn't forgotten.</AppText>
        ) : (
          <View style={styles.list}>
            {pendingFollowUps.map((followUp) => (
              <FollowUpRow
                key={followUp.id}
                followUp={followUp}
                now={now}
                hideLead
                onComplete={followUpActions.onComplete}
                onMore={followUpActions.onMore}
              />
            ))}
          </View>
        )}
      </Card>

      <OwnerCard lead={lead} canWrite={canEdit} />

      <Card>
        <AppText variant="heading">Requirement</AppText>
        <AppText>{lead.requirement}</AppText>
        {lead.tags.length > 0 && (
          <AppText variant="small" muted>
            Tags: {lead.tags.join(", ")}
          </AppText>
        )}
      </Card>

      <Card>
        <AppText variant="heading">Details</AppText>
        <Detail icon="wallet-outline" label="Budget" value={lead.budget != null ? formatCurrency(lead.budget) : null} />
        <Detail icon="hourglass-outline" label="Timeline" value={lead.timeline && leadTimelineLabels[lead.timeline]} />
        <Detail icon="person-outline" label="Contact person" value={lead.name} />
        <Detail icon="call-outline" label="Phone" value={lead.phone} />
        <Detail icon="mail-outline" label="Email" value={lead.email} />
        <Detail icon="business-outline" label="Business type" value={lead.businessType} />
        <Detail icon="location-outline" label="Location" value={location} />
        <Detail
          icon="pricetag-outline"
          label="Source"
          value={`${sourceLabel(lead.source)}${lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}`}
        />
        <Detail
          icon="calendar-outline"
          label="Added"
          value={`${formatDate(lead.createdAt)}${lead.createdBy ? ` by ${lead.createdBy.name}` : ""}`}
        />
        {customFields.map((field) => (
          <Detail
            key={field.key}
            icon="list-outline"
            label={field.label}
            value={formatCustomFieldValue(field, lead.customFields?.[field.key])}
          />
        ))}
      </Card>

      <Card>
        <AppText variant="heading">Team comments</AppText>
        <CommentThread leadId={lead.id} canWrite={canEdit} />
      </Card>

      <AttachmentsCard leadId={lead.id} canWrite={canEdit} />

      <Card>
        <AppText variant="heading">Notes & history</AppText>
        {canEdit && <AddNote leadId={lead.id} />}
        {activities.isPending ? (
          <AppText muted>Loading…</AppText>
        ) : activities.error ? (
          <AppText muted>{getErrorMessage(activities.error)}</AppText>
        ) : activities.data && activities.data.length > 0 ? (
          <View style={styles.history}>
            {activities.data.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </View>
        ) : (
          <AppText muted>No history yet.</AppText>
        )}
      </Card>

      {manager && <LeadViewsCard leadId={lead.id} />}
      {manager && canEdit && (
        <Button title="Move to recycle bin" variant="ghost" icon="trash-outline" onPress={confirmDelete} style={styles.delete} />
      )}

      <StageSheet lead={lead} open={stageOpen} onClose={() => setStageOpen(false)} />
      <RatingSheet lead={lead} open={ratingOpen} onClose={() => setRatingOpen(false)} />
      <ScheduleSheet lead={lead} open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <MessageSheet lead={lead} channel={message} onClose={() => setMessage(null)} />
      <LogCallSheet
        lead={lead}
        open={!!callSheet}
        startedAt={callSheet?.startedAt}
        onClose={() => setCallSheet(null)}
      />
      {followUpActions.sheets}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <AppText variant="small" weight="500">
        {label}
      </AppText>
    </Pressable>
  );
}

function Detail({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={18} color={colors.mutedText} style={styles.detailIcon} />
      <View style={styles.flex}>
        <AppText variant="small" muted>
          {label}
        </AppText>
        <AppText selectable>{value || "—"}</AppText>
      </View>
    </View>
  );
}

function AddNote({ leadId }: { leadId: string }) {
  const addNote = useAddNote(leadId);
  const [note, setNote] = useState("");

  function save() {
    addNote.mutate(note.trim(), {
      onSuccess: () => setNote(""),
      onError: (error) => Alert.alert("Couldn't save the note", getErrorMessage(error)),
    });
  }

  return (
    <View style={styles.note}>
      <TextField
        label="Add a note"
        value={note}
        onChangeText={setNote}
        placeholder="What happened, what's next…"
        multiline
        maxLength={2000}
      />
      {note.trim().length > 0 && (
        <Button title="Save note" variant="secondary" loading={addNote.isPending} onPress={save} />
      )}
    </View>
  );
}

/** Pin Hot / Warm / Cold by hand, or let the score decide again. */
function RatingSheet({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const mutation = useSetLeadRating(lead.id);
  const AUTO = "auto";

  function select(value: LeadRating | typeof AUTO) {
    const rating = value === AUTO ? null : value;
    if (rating === (lead.ratingManual ? lead.rating : null)) return onClose();
    mutation.mutate(rating, {
      onSuccess: onClose,
      onError: (error) => Alert.alert("Couldn't change the rating", getErrorMessage(error)),
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rating"
      subtitle={`Score ${lead.score}/100, from the stage, budget, timeline and how recently someone reached them. 60+ is hot, 35+ warm.`}
    >
      <OptionList<LeadRating | typeof AUTO>
        options={[
          { value: AUTO, label: "Automatic (follow the score)" },
          ...LEAD_RATINGS.map((rating) => ({ value: rating, label: leadRatingLabels[rating] })),
        ]}
        value={lead.ratingManual ? lead.rating : AUTO}
        onSelect={select}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs + 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.xs },
  tappableBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inlineButton: { minHeight: 36, paddingHorizontal: spacing.sm },
  list: { gap: spacing.sm },
  detail: { flexDirection: "row", gap: spacing.md, paddingVertical: 2 },
  detailIcon: { marginTop: 2 },
  history: { gap: spacing.lg, marginTop: spacing.sm },
  note: { gap: spacing.sm },
  delete: { alignSelf: "center" },
});
