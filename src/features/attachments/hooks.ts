import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { leadKeys } from "@/features/leads/hooks";
import { apiClient, apiUrl, authHeaders, readEnvelope } from "@/lib/api-client";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/attachments). */
export interface Attachment {
  id: string;
  lead: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy: UserSummary;
  createdAt: string;
}

/** Keep in sync with server/src/modules/attachments/attachment.constants.ts */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
];

/** A file picked on the phone, ready to upload. */
export interface PickedFile {
  uri: string;
  name: string;
  size?: number;
}

export const attachmentKeys = {
  list: (leadId: string) => ["attachments", leadId] as const,
};

export function useAttachments(leadId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(leadId),
    queryFn: () => apiClient.get<Attachment[]>(`/leads/${leadId}/attachments`),
  });
}

/** What's wrong with a file before uploading it (type, size), or `null`. */
export function checkFile(file: PickedFile) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ATTACHMENT_EXTENSIONS.includes(extension)) {
    return "This type of file can't be attached. Use a PDF, an image, or an Office / CSV / text file.";
  }
  if (file.size !== undefined && file.size > ATTACHMENT_MAX_BYTES) return "Files can be up to 10 MB.";
  return null;
}

/**
 * Sends the file as the raw request body (what the API expects, same as the
 * website); its name goes in `?name=`.
 */
async function upload(leadId: string, file: PickedFile) {
  const result = await new File(file.uri).upload(
    apiUrl(`/leads/${leadId}/attachments?name=${encodeURIComponent(file.name)}`),
    {
      httpMethod: "POST",
      headers: { ...authHeaders(), Accept: "application/json", "Content-Type": "application/octet-stream" },
    },
  );
  return readEnvelope<Attachment>(result.status, result.body);
}

export function useUploadAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: PickedFile) => upload(leadId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentKeys.list(leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
    },
  });
}

export function useDeleteAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<null>(`/leads/${leadId}/attachments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentKeys.list(leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
    },
  });
}

/**
 * Downloads the file (signed in) to the phone's cache, then opens the share
 * sheet so it can be viewed in another app, saved or forwarded.
 */
export async function openAttachment(attachment: Attachment) {
  const target = new File(Paths.cache, `${attachment.id}-${attachment.fileName.replace(/[\\/]/g, "_")}`);
  if (!target.exists) {
    await File.downloadFileAsync(apiUrl(`/leads/${attachment.lead}/attachments/${attachment.id}/file`), target, {
      headers: authHeaders(),
      idempotent: true,
    });
  }
  await Sharing.shareAsync(target.uri, { mimeType: attachment.contentType, dialogTitle: attachment.fileName });
}

/** "2.4 MB" · "380 KB" */
export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
