import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { checkFile, formatBytes, type PickedFile } from "@/features/attachments/hooks";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { getErrorMessage } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { openTaskFile, useDeleteTaskFile, useTaskFiles, useUploadTaskFile } from "../hooks";
import type { TaskFile } from "../types";

function photoName(extension: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `photo-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.${extension}`;
}

/** Files on a task. Tap to open or share; long-press to remove. */
export function TaskFiles({ taskId, canWrite, canManage }: { taskId: string; canWrite: boolean; canManage: boolean }) {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const files = useTaskFiles(taskId);
  const uploadMutation = useUploadTaskFile(taskId);
  const remove = useDeleteTaskFile(taskId);
  const [opening, setOpening] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  function upload(file: PickedFile) {
    const problem = checkFile(file);
    if (problem) return Alert.alert("Can't attach this file", problem);
    uploadMutation.mutate(file, { onError: (error) => Alert.alert("Couldn't attach the file", getErrorMessage(error)) });
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera not allowed", "Allow camera access for GetCloseWise in your phone's settings.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) upload({ uri: asset.uri, name: photoName("jpg"), size: asset.fileSize });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const extension = asset.mimeType === "image/png" ? "png" : asset.mimeType === "image/webp" ? "webp" : "jpg";
    const name = asset.fileName && checkFile({ uri: asset.uri, name: asset.fileName }) === null ? asset.fileName : photoName(extension);
    upload({ uri: asset.uri, name, size: asset.fileSize });
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) upload({ uri: asset.uri, name: asset.name, size: asset.size });
  }

  /** Closes the menu first: the camera or picker can't open over a closing sheet. */
  function choose(action: () => Promise<void>) {
    setChoosing(false);
    setTimeout(() => void action(), 400);
  }

  async function open(file: TaskFile) {
    setOpening(file.id);
    try {
      await openTaskFile(taskId, file);
    } catch (error) {
      Alert.alert("Couldn't open the file", getErrorMessage(error));
    } finally {
      setOpening(null);
    }
  }

  function confirmRemove(file: TaskFile) {
    if (!canWrite || !(file.uploadedBy?.id === user.id || canManage)) return;
    Alert.alert(`Remove ${file.fileName}?`, "It will be deleted for everyone.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => remove.mutate(file.id, { onError: (error) => Alert.alert("Couldn't remove it", getErrorMessage(error)) }),
      },
    ]);
  }

  const list = files.data ?? [];

  return (
    <View style={styles.wrapper}>
      {files.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : list.length === 0 ? (
        <AppText muted>No files yet.</AppText>
      ) : (
        list.map((file) => (
          <Pressable
            key={file.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${file.fileName}`}
            onPress={() => void open(file)}
            onLongPress={() => confirmRemove(file)}
            disabled={opening === file.id}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
          >
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              {opening === file.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-outline" size={18} color={colors.primary} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText numberOfLines={1}>{file.fileName}</AppText>
              <AppText variant="small" muted numberOfLines={1}>
                {formatBytes(file.size)} · {file.uploadedBy?.name ?? "Someone"} · {formatTimeAgo(file.createdAt)}
              </AppText>
            </View>
            <Ionicons name="share-outline" size={18} color={colors.mutedText} />
          </Pressable>
        ))
      )}
      {canWrite && <Button title="Attach" variant="secondary" icon="attach" loading={uploadMutation.isPending} onPress={() => setChoosing(true)} />}
      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Attach a file" subtitle="Up to 10 MB: PDF, images, Office, CSV or text files.">
        <View>
          <ListRow icon="camera-outline" title="Take a photo" onPress={() => choose(takePhoto)} />
          <ListRow icon="images-outline" title="Choose a photo" onPress={() => choose(pickPhoto)} />
          <ListRow icon="folder-open-outline" title="Choose a file" onPress={() => choose(pickDocument)} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
