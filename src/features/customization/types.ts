/** Mirrors the API (server/src/modules/customization). Only what the app reads. */
export const COLOR_NAMES = [
  "slate",
  "sky",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "pink",
  "rose",
  "orange",
  "amber",
  "yellow",
  "lime",
  "emerald",
  "teal",
  "cyan",
] as const;
export type ColorName = (typeof COLOR_NAMES)[number];

/** Every pipeline ends with these; they can be renamed and recolored but not removed. */
export const WON_STAGE = "won";
export const LOST_STAGE = "lost";
export const CLOSED_STAGES: readonly string[] = [WON_STAGE, LOST_STAGE];

export interface PipelineStage {
  key: string;
  label: string;
  color: ColorName;
}

export interface LeadSourceOption {
  key: string;
  label: string;
}

export interface TagOption {
  name: string;
  color: ColorName;
}

export const CUSTOM_FIELD_TYPES = ["text", "textarea", "number", "date", "select", "checkbox"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
}

export type CustomFieldValue = string | number | boolean;

export interface WorkspaceSettings {
  pipelineStages: PipelineStage[];
  leadSources: LeadSourceOption[];
  lostReasons: string[];
  tags: TagOption[];
  customFields: CustomFieldDefinition[];
}

/** Used until the organization's settings load (and by companies that never changed them). */
export const DEFAULT_SETTINGS: WorkspaceSettings = {
  pipelineStages: [
    { key: "new", label: "New", color: "sky" },
    { key: "contacted", label: "Contacted", color: "violet" },
    { key: "owner_details", label: "Owner Details", color: "fuchsia" },
    { key: "call_with_owner", label: "Call with Owner", color: "teal" },
    { key: "interested", label: "Interested", color: "cyan" },
    { key: "meeting", label: "Meeting", color: "indigo" },
    { key: "proposal", label: "Proposal", color: "amber" },
    { key: "negotiation", label: "Negotiation", color: "orange" },
    { key: WON_STAGE, label: "Won", color: "emerald" },
    { key: LOST_STAGE, label: "Lost", color: "rose" },
  ],
  leadSources: [
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "google", label: "Google" },
    { key: "website", label: "Website" },
    { key: "referral", label: "Referral" },
    { key: "cold_call", label: "Cold call" },
    { key: "walk_in", label: "Walk-in" },
    { key: "event", label: "Event" },
    { key: "other", label: "Other" },
  ],
  lostReasons: [
    "Budget too low",
    "Went with a competitor",
    "No response",
    "Not a fit for our services",
    "Project postponed",
  ],
  tags: [],
  customFields: [],
};
