import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { isManagerRole } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatTimeAgo, getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useMentionable,
  useUpdateComment,
  type LeadComment,
} from "../hooks";
import { activeMentionQuery, fromTokens, parseComment, toTokens } from "../mentions";

interface CommentThreadProps {
  leadId: string;
  /** False in a read-only workspace */
  canWrite: boolean;
}

/** The team's discussion on a lead. Type @ to mention someone; they get an alert. */
export function CommentThread({ leadId, canWrite }: CommentThreadProps) {
  const user = useCurrentUser();
  const comments = useComments(leadId);
  const remove = useDeleteComment(leadId);
  const [editing, setEditing] = useState<LeadComment | null>(null);

  function showActions(comment: LeadComment) {
    const mine = comment.author?.id === user.id;
    const canDelete = mine || isManagerRole(user.role);
    if (!canWrite || !canDelete) return;
    Alert.alert("Comment", undefined, [
      ...(mine ? [{ text: "Edit", onPress: () => setEditing(comment) }] : []),
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: () =>
          remove.mutate(comment.id, { onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)) }),
      },
      { text: "Close", style: "cancel" as const },
    ]);
  }

  const list = comments.data ?? [];

  return (
    <View style={styles.thread}>
      {comments.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : comments.error && list.length === 0 ? (
        <AppText muted>{getErrorMessage(comments.error)}</AppText>
      ) : list.length === 0 ? (
        <AppText muted>No comments yet. Ask a teammate something, or @mention them to get their attention.</AppText>
      ) : (
        list.map((comment) =>
          editing?.id === comment.id ? (
            <Composer key={comment.id} leadId={leadId} editing={comment} onDone={() => setEditing(null)} />
          ) : (
            <CommentItem key={comment.id} comment={comment} onLongPress={() => showActions(comment)} />
          ),
        )
      )}
      {canWrite && !editing && <Composer leadId={leadId} />}
    </View>
  );
}

function CommentItem({ comment, onLongPress }: { comment: LeadComment; onLongPress: () => void }) {
  const { colors } = useTheme();
  const name = comment.author?.name ?? "Someone";
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={350} style={styles.item} accessibilityHint="Long-press for options">
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <AppText variant="small" weight="700" color={colors.primary}>
          {getInitials(name)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="small">
          <AppText variant="small" weight="600">
            {name}
          </AppText>
          <AppText variant="small" muted>
            {` · ${formatTimeAgo(comment.createdAt)}${comment.editedAt ? " · edited" : ""}`}
          </AppText>
        </AppText>
        <AppText>
          {parseComment(comment.body).map((part, index) =>
            part.kind === "mention" ? (
              <AppText key={index} weight="600" color={colors.primary}>
                @{part.name}
              </AppText>
            ) : (
              part.text
            ),
          )}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Write or edit a comment, with @mention suggestions while typing. */
function Composer({ leadId, editing, onDone }: { leadId: string; editing?: LeadComment; onDone?: () => void }) {
  const { colors } = useTheme();
  const create = useCreateComment(leadId);
  const update = useUpdateComment(leadId);
  const mutation = editing ? update : create;

  const [initial] = useState(() => (editing ? fromTokens(editing.body) : { text: "", mentions: new Map<string, string>() }));
  const [text, setText] = useState(initial.text);
  const [cursor, setCursor] = useState(initial.text.length);
  const mentions = useRef(initial.mentions);
  const [touched, setTouched] = useState(false);
  const input = useRef<TextInput>(null);

  const people = useMentionable(leadId, touched);
  const active = activeMentionQuery(text, cursor);
  const suggestions = active
    ? (people.data ?? [])
        .filter((p) => p.name.toLowerCase().includes(active.query.toLowerCase()))
        .slice(0, 5)
    : [];

  function pick(person: { id: string; name: string }) {
    if (!active) return;
    const next = `${text.slice(0, active.start)}@${person.name} ${text.slice(cursor)}`;
    mentions.current.set(person.name, person.id);
    setText(next);
    setCursor(active.start + person.name.length + 2);
    input.current?.focus();
  }

  function send() {
    const body = toTokens(text.trim(), mentions.current);
    const options = {
      onSuccess: () => {
        setText("");
        setCursor(0);
        mentions.current = new Map();
        onDone?.();
      },
      onError: (error: unknown) => Alert.alert("Couldn't save the comment", getErrorMessage(error)),
    };
    if (editing) update.mutate({ id: editing.id, body }, options);
    else create.mutate(body, options);
  }

  return (
    <View style={styles.composer}>
      {suggestions.length > 0 && (
        <View style={[styles.suggestions, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {suggestions.map((person) => (
            <Pressable
              key={person.id}
              onPress={() => pick(person)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Ionicons name="at" size={16} color={colors.primary} />
              <AppText>{person.name}</AppText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.input }]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={(value) => {
            setText(value);
            setTouched(true);
          }}
          onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
          placeholder={editing ? "Edit your comment" : "Write a comment… type @ to mention"}
          placeholderTextColor={colors.mutedText}
          multiline
          maxLength={4000}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel="Comment"
        />
      </View>
      {(text.trim().length > 0 || editing) && (
        <View style={styles.buttons}>
          {editing && <Button title="Cancel" variant="ghost" onPress={() => onDone?.()} />}
          <Button
            title={editing ? "Save" : "Comment"}
            icon={editing ? "checkmark" : "send"}
            loading={mutation.isPending}
            disabled={!text.trim()}
            onPress={send}
            style={styles.flex}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  thread: { gap: spacing.md },
  item: { flexDirection: "row", gap: spacing.sm + 2 },
  avatar: { width: 30, height: 30, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  composer: { gap: spacing.sm },
  suggestions: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  inputBox: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { fontSize: 16, minHeight: 44, maxHeight: 160, paddingVertical: spacing.sm + 2 },
  buttons: { flexDirection: "row", gap: spacing.sm },
});
