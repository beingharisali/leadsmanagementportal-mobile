import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { apiClient } from "@/lib/api-client";

import {
  DEFAULT_SETTINGS,
  type ColorName,
  type CustomFieldDefinition,
  type CustomFieldType,
  type CustomFieldValue,
  type SettingsUsage,
  type StageReset,
  type TagOption,
  type TeamSettings,
  type TrackingSettings,
  type WorkspaceSettings,
} from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
};

/** The company's stages, sources, lost reasons and custom fields (Settings on the website). */
export function useWorkspaceSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => apiClient.get<WorkspaceSettings>("/settings"),
    staleTime: 5 * 60_000,
  });
}

/** Labels and colours for stage and source keys, with the defaults until the settings load. */
export function useLeadOptions() {
  const { data } = useWorkspaceSettings();
  const settings = data ?? DEFAULT_SETTINGS;

  const stageLabel = useCallback(
    (key: string) => settings.pipelineStages.find((s) => s.key === key)?.label ?? key.replace(/_/g, " "),
    [settings],
  );
  const stageColor = useCallback(
    (key: string) => settings.pipelineStages.find((s) => s.key === key)?.color ?? "slate",
    [settings],
  );
  const sourceLabel = useCallback(
    (key: string) => settings.leadSources.find((s) => s.key === key)?.label ?? key.replace(/_/g, " "),
    [settings],
  );
  const customField = useCallback(
    (key: string) => settings.customFields.find((f) => f.key === key),
    [settings],
  );

  return useMemo(
    () => ({
      stages: settings.pipelineStages,
      sources: settings.leadSources,
      lostReasons: settings.lostReasons,
      tags: settings.tags,
      customFields: settings.customFields,
      tracking: settings.tracking,
      team: settings.team,
      stageLabel,
      stageColor,
      sourceLabel,
      customField,
    }),
    [settings, stageLabel, stageColor, sourceLabel, customField],
  );
}

export type LeadOptions = ReturnType<typeof useLeadOptions>;

/** A stored custom field value as readable text (`null` when empty). */
export function formatCustomFieldValue(field: CustomFieldDefinition, value: CustomFieldValue | undefined | null) {
  if (value === undefined || value === null || value === "") return null;
  switch (field.type) {
    case "checkbox":
      return value ? "Yes" : "No";
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-PK") : String(value);
    case "date":
      // A calendar day, not an instant: format it in UTC so it never shifts a day.
      return new Date(`${String(value)}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    default:
      return String(value);
  }
}

// ---- Editing the workspace (owners and admins) ----

export function useSettingsUsage() {
  return useQuery({ queryKey: [...settingsKeys.all, "usage"], queryFn: () => apiClient.get<SettingsUsage>("/settings/usage") });
}

/** Saving settings returns the whole new settings; leads may have moved, so they refresh too. */
function useSaveSettings<P>(request: (payload: P) => Promise<WorkspaceSettings>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.all, settings);
      void queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, "usage"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

/** `moveLeads`: leads of removed stages / sources go to another, `{ removedKey: targetKey }`. */
type MoveLeads = Record<string, string>;

export const useUpdatePipeline = () =>
  useSaveSettings((payload: { stages: { key?: string; label: string; color: ColorName }[]; moveLeads?: MoveLeads }) =>
    apiClient.put<WorkspaceSettings>("/settings/pipeline", payload),
  );

export const useUpdateStageReset = () =>
  useSaveSettings((stageReset: StageReset | null) => apiClient.put<WorkspaceSettings>("/settings/stage-reset", { stageReset }));

export const useUpdateSources = () =>
  useSaveSettings((payload: { sources: { key?: string; label: string }[]; moveLeads?: MoveLeads }) =>
    apiClient.put<WorkspaceSettings>("/settings/sources", payload),
  );

export const useUpdateLostReasons = () =>
  useSaveSettings((lostReasons: string[]) => apiClient.put<WorkspaceSettings>("/settings/lost-reasons", { lostReasons }));

export const useUpdateTags = () =>
  useSaveSettings((tags: TagOption[]) => apiClient.put<WorkspaceSettings>("/settings/tags", { tags }));

export const useRenameTag = () =>
  useSaveSettings((payload: { from: string; to: string }) => apiClient.post<WorkspaceSettings>("/settings/tags/rename", payload));

export const useDeleteTag = () =>
  useSaveSettings((name: string) => apiClient.delete<WorkspaceSettings>(`/settings/tags/${encodeURIComponent(name)}`));

export const useUpdateCustomFields = () =>
  useSaveSettings(
    (fields: { key?: string; label: string; type: CustomFieldType; options: string[]; required: boolean }[]) =>
      apiClient.put<WorkspaceSettings>("/settings/custom-fields", { fields }),
  );

export const useUpdateTracking = () =>
  useSaveSettings((tracking: TrackingSettings) => apiClient.put<WorkspaceSettings>("/settings/tracking", tracking));

export const useUpdateTeamSettings = () =>
  useSaveSettings((team: TeamSettings) => apiClient.put<WorkspaceSettings>("/settings/team", team));
