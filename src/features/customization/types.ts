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

/**
 * Leads left in `from` move to `to` at midnight the next day, e.g. "Not picked"
 * → "New" or "Not Interested" → Lost. Into Lost, the lead needs a lost reason
 * when it enters `from`.
 */
export interface StageReset {
  from: string;
  to: string;
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

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  checkbox: "Yes / No",
};

/** How many leads use each stage, source, tag and custom field (owners and admins). */
export interface SettingsUsage {
  stages: Record<string, number>;
  sources: Record<string, number>;
  tags: { name: string; count: number }[];
  customFields: Record<string, number>;
}

/** Same limits as the API (server/src/modules/customization/customization.constants.ts). */
export const SETTINGS_LIMITS = { stages: 30, sources: 50, lostReasons: 30, tags: 100, customFields: 30, selectOptions: 50 };

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
}

export type CustomFieldValue = string | number | boolean;

export interface TrackingSettings {
  /** No touch for this long: idle (not counted as active work time) */
  idleAfterMinutes: number;
  /** No touch for this long: signed out */
  autoLogoutMinutes: number;
  timeZone: string;
  /** "HH:MM" */
  shiftStart: string;
  shiftEnd: string;
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
}

/** What a target can be set on. 0 = no target. */
export const TARGET_METRICS = ["calls", "followUpsDone", "messages", "won", "wonValue"] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];

export const targetMetricLabels: Record<TargetMetric, string> = {
  calls: "Calls",
  followUpsDone: "Follow-ups done",
  messages: "Messages",
  won: "Deals won",
  wonValue: "Won value",
};

export type TargetSet = Record<TargetMetric, number>;
export const NO_TARGETS: TargetSet = { calls: 0, followUpsDone: 0, messages: 0, won: 0, wonValue: 0 };

export interface AgentTargets {
  user: string;
  daily: TargetSet;
  monthly: TargetSet;
}

/** Targets and automatic rules for the sales team. */
export interface TeamSettings {
  dailyTargets: TargetSet;
  monthlyTargets: TargetSet;
  /** Agents whose targets differ from the team's */
  agentTargets: AgentTargets[];
  /** 0 = off */
  staleAfterDays: number;
  /** 0 = off */
  expireAfterDays: number;
  endOfDayReport: boolean;
}

export interface WorkspaceSettings {
  pipelineStages: PipelineStage[];
  /** The daily moves; empty = none */
  stageResets: StageReset[];
  leadSources: LeadSourceOption[];
  lostReasons: string[];
  tags: TagOption[];
  customFields: CustomFieldDefinition[];
  tracking: TrackingSettings;
  team: TeamSettings;
}

/** Used until the organization's settings load (and by companies that never changed them). */
export const DEFAULT_SETTINGS: WorkspaceSettings = {
  pipelineStages: [
    { key: "new", label: "New", color: "sky" },
    { key: "contacted", label: "Contacted", color: "violet" },
    { key: "owner_details", label: "Owner Details", color: "fuchsia" },
    { key: "call_with_owner", label: "Call with Owner", color: "teal" },
    { key: "interested", label: "Interested", color: "cyan" },
    { key: "not_interested", label: "Not Interested", color: "slate" },
    { key: "meeting", label: "Meeting", color: "indigo" },
    { key: "proposal", label: "Proposal", color: "amber" },
    { key: "negotiation", label: "Negotiation", color: "orange" },
    { key: WON_STAGE, label: "Won", color: "emerald" },
    { key: LOST_STAGE, label: "Lost", color: "rose" },
  ],
  stageResets: [{ from: "not_interested", to: LOST_STAGE }],
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
  tracking: {
    idleAfterMinutes: 5,
    autoLogoutMinutes: 30,
    timeZone: "Asia/Karachi",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    workDays: [1, 2, 3, 4, 5, 6],
  },
  team: {
    dailyTargets: NO_TARGETS,
    monthlyTargets: NO_TARGETS,
    agentTargets: [],
    staleAfterDays: 7,
    expireAfterDays: 0,
    endOfDayReport: true,
  },
};
