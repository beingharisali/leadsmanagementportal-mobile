import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { activeMentionQuery, fromTokens, parseComment, toTokens } from "@/features/comments/mentions";
import { markInput } from "@/features/tracking/activity";
import { getErrorMessage } from "@/lib/api-client";
import { formatTimeAgo, getInitials } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useAddTaskComment, useDeleteTaskComment, useEditTaskComment, useTaskComments, useTaskMentionable } from "../hooks";
import type { TaskComment } from "../types";

/** The task's discussion. Type @ to mention someone who can open the task. Long-press a comment for options. */
export function TaskComments({ taskId, canWrite, canManage }: { taskId: string; canWrite: boolean; canManage: boolean }) {
  const user = useCurrentUser();
  const comments = useTaskComments(taskId);
  const remove = useDeleteTaskComment(taskId);
  const [editing, setEditing] = useState<TaskComment | null>(null);

  function showActions(comment: TaskComment) {
    const mine = comment.author?.id === user.id;
    if (!canWrite || !(mine || canManage)) return;
    Alert.alert("Comment", undefined, [
      ...(mine ? [{ text: "Edit", onPress: () => setEditing(comment) }] : []),
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: () => remove.mutate(comment.id, { onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)) }),
      },
      { text: "Close", style: "cancel" as const },
    ]);
  }

  const list = comments.data ?? [];

  return (
    <View style={styles.thread}>
      {comments.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : list.length === 0 ? (
        <AppText muted>No comments yet.</AppText>
      ) : (
        list.map((comment) =>
          editing?.id === comment.id ? (
            <Composer key={comment.id} taskId={taskId} editing={comment} onDone={() => setEditing(null)} />
          ) : (
            <Item key={comment.id} comment={comment} onLongPress={() => showActions(comment)} />
          ),
        )
      )}
      {canWrite && !editing && <Composer taskId={taskId} />}
    </View>
  );
}

function Item({ comment, onLongPress }: { comment: TaskComment; onLongPress: () => void }) {
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

function Composer({ taskId, editing, onDone }: { taskId: string; editing?: TaskComment; onDone?: () => void }) {
  const { colors } = useTheme();
  const create = useAddTaskComment(taskId);
  const update = useEditTaskComment(taskId);
  const mutation = editing ? update : create;
  const [initial] = useState(() => (editing ? fromTokens(editing.body) : { text: "", mentions: new Map<string, string>() }));
  const [text, setText] = useState(initial.text);
  const [cursor, setCursor] = useState(initial.text.length);
  const mentions = useRef(initial.mentions);
  const [touched, setTouched] = useState(false);
  const input = useRef<TextInput>(null);

  const people = useTaskMentionable(taskId, touched);
  const active = activeMentionQuery(text, cursor);
  const suggestions = active
    ? (people.data ?? []).filter((p) => p.name.toLowerCase().includes(active.query.toLowerCase())).slice(0, 5)
    : [];

  function pick(person: { id: string; name: string }) {
    if (!active) return;
    mentions.current.set(person.name, person.id);
    setText(`${text.slice(0, active.start)}@${person.name} ${text.slice(cursor)}`);
    setCursor(active.start + person.name.length + 2);
    input.current?.focus();
  }

  function send() {
    const body = toTokens(text.trim(), mentions.current);
    if (!body) return;
    const options = {
      onSuccess: () => {
        setText("");
        setCursor(0);
        mentions.current = new Map();
        onDone?.();
      },
      onError: (error: unknown) => Alert.alert("Couldn't save the comment", getErrorMessage(error)),
    };
    if (editing) update.mutate({ commentId: editing.id, body }, options);
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
            markInput();
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
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  thread: { gap: spacing.md },
  item: { flexDirection: "row", gap: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  composer: { gap: spacing.sm },
  suggestions: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  inputBox: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { fontSize: 16, minHeight: 44, maxHeight: 160, paddingVertical: spacing.sm },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
