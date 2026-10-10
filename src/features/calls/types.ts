/** Mirrors the API (server/src/modules/calls/call.constants.ts). Keep in sync. */
export const CALL_OUTCOMES = [
  "connected",
  "no_answer",
  "busy",
  "voicemail",
  "callback_requested",
  "wrong_number",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export type CallDirection = "outbound" | "inbound";

export interface CallLogPayload {
  direction: CallDirection;
  outcome: CallOutcome;
  durationSeconds: number;
  notes?: string;
}

export const callOutcomeLabels: Record<CallOutcome, string> = {
  connected: "Connected",
  no_answer: "No answer",
  busy: "Busy",
  voicemail: "Voicemail",
  callback_requested: "Asked to call back",
  wrong_number: "Wrong number",
};

/** "4m 05s" · "1h 02m" · "45s" */
export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** "m:ss", "h:mm:ss" or plain minutes → seconds (`null` when it can't be read). */
export function parseDuration(value: string): number | null {
  const text = value.trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text) * 60;
  const parts = text.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isInteger(p) || p < 0) || parts.length > 3) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Seconds → "m:ss" for the duration field. */
export function toDurationInput(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
