import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { useCurrentUser } from "@/features/auth/auth-provider";
import { isManagerRole } from "@/features/users/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import {
  checkFile,
  formatBytes,
  openAttachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  type Attachment,
  type PickedFile,
} from "../hooks";

type IconName = ComponentProps<typeof Ionicons>["name"];

function fileIcon(contentType: string): IconName {
  if (contentType.startsWith("image/")) return "image-outline";
  if (contentType === "application/pdf") return "document-text-outline";
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType === "text/csv") return "grid-outline";
  return "document-outline";
}

/** "photo-2026-10-10-1432.jpg" for camera shots, which come without a useful name. */
function photoName(extension: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `photo-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.${extension}`;
}

/** Files on a lead: quotes, visiting cards, photos of documents. Tap to open or share. */
export function AttachmentsCard({ leadId, canWrite }: { leadId: string; canWrite: boolean }) {
  const user = useCurrentUser();
  const attachments = useAttachments(leadId);
  const uploadMutation = useUploadAttachment(leadId);
  const remove = useDeleteAttachment(leadId);
  const [opening, setOpening] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  function upload(file: PickedFile) {
    const problem = checkFile(file);
    if (problem) return Alert.alert("Can't attach this file", problem);
    uploadMutation.mutate(file, {
      onError: (error) => Alert.alert("Couldn't attach the file", getErrorMessage(error)),
    });
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Camera not allowed", "Allow camera access for GetCloseWise in your phone's settings.");
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) upload({ uri: asset.uri, name: photoName("jpg"), size: asset.fileSize });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const extension = asset.mimeType === "image/png" ? "png" : asset.mimeType === "image/webp" ? "webp" : "jpg";
    // Library photos may be HEIC on iPhone; the picker converts them to JPEG, so name them to match.
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

  async function open(attachment: Attachment) {
    setOpening(attachment.id);
    try {
      await openAttachment(attachment);
    } catch (error) {
      Alert.alert("Couldn't open the file", getErrorMessage(error));
    } finally {
      setOpening(null);
    }
  }

  function confirmRemove(attachment: Attachment) {
    const allowed = attachment.uploadedBy?.id === user.id || isManagerRole(user.role);
    if (!canWrite || !allowed) return;
    Alert.alert(`Remove ${attachment.fileName}?`, "It will be deleted for everyone.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          remove.mutate(attachment.id, { onError: (error) => Alert.alert("Couldn't remove it", getErrorMessage(error)) }),
      },
    ]);
  }

  const files = attachments.data ?? [];

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Files</AppText>
        {canWrite && (
          <Button
            title="Attach"
            variant="ghost"
            icon="attach"
            loading={uploadMutation.isPending}
            onPress={() => setChoosing(true)}
            style={styles.inlineButton}
          />
        )}
      </View>
      {attachments.isPending ? (
        <AppText muted>Loading…</AppText>
      ) : files.length === 0 ? (
        <AppText muted>No files yet. Attach quotes, visiting cards or photos of documents.</AppText>
      ) : (
        files.map((attachment) => (
          <FileRow
            key={attachment.id}
            attachment={attachment}
            opening={opening === attachment.id}
            onPress={() => void open(attachment)}
            onLongPress={() => confirmRemove(attachment)}
          />
        ))
      )}
      <Sheet
        open={choosing}
        onClose={() => setChoosing(false)}
        title="Attach a file"
        subtitle="Up to 10 MB: PDF, images, Office, CSV or text files."
      >
        <View>
          <ListRow icon="camera-outline" title="Take a photo" onPress={() => choose(takePhoto)} />
          <ListRow icon="images-outline" title="Choose a photo" onPress={() => choose(pickPhoto)} />
          <ListRow icon="folder-open-outline" title="Choose a file" onPress={() => choose(pickDocument)} />
        </View>
      </Sheet>
    </Card>
  );
}

function FileRow({
  attachment,
  opening,
  onPress,
  onLongPress,
}: {
  attachment: Attachment;
  opening: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${attachment.fileName}`}
      accessibilityHint="Long-press to remove"
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={opening}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        {opening ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={fileIcon(attachment.contentType)} size={18} color={colors.primary} />
        )}
      </View>
      <View style={styles.flex}>
        <AppText numberOfLines={1}>{attachment.fileName}</AppText>
        <AppText variant="small" muted numberOfLines={1}>
          {formatBytes(attachment.size)} · {attachment.uploadedBy?.name ?? "Someone"} · {formatTimeAgo(attachment.createdAt)}
        </AppText>
      </View>
      <Ionicons name="share-outline" size={18} color={colors.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inlineButton: { minHeight: 36, paddingHorizontal: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
