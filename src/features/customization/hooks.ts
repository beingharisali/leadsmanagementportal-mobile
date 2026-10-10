import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { apiClient } from "@/lib/api-client";

import { DEFAULT_SETTINGS, type CustomFieldValue, type CustomFieldDefinition, type WorkspaceSettings } from "./types";

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
