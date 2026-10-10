import type { PresenceState, PresenceStatus, SessionEndReason } from "./types";

/** Same helpers as the website (client/features/tracking/format.ts). */

/** 5400000 → "1h 30m", 90000 → "1m", 0 → "0m" */
export function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return ms > 0 && totalMinutes === 0 ? "<1m" : `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Clock time in the business time zone, e.g. "09:42". */
export function formatTime(value: string | Date, timeZone?: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
}

/** "2 min ago", "3 h ago", "12 Sep" */
export function formatRelative(value: string | Date, now = Date.now()) {
  const diff = Math.max(0, now - new Date(value).getTime());
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "2026-09-28" → "Mon, 28 Sep 2026" (the string is a calendar day, not an instant). */
export function formatDay(day: string, withYear = true) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function addDays(day: string, amount: number) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10);
}

/** Today's date in a time zone, as "YYYY-MM-DD". */
export function todayIn(timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "45m", "1h 20m": late arrivals and early leaves. */
export function formatMinutes(minutes: number) {
  return formatDuration(minutes * 60_000);
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:00–18:00, Mon–Sat" */
export function formatShift(shift: { start: string; end: string; workDays: number[] }) {
  const days = [...shift.workDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const contiguous = days.every((d, i) => i === 0 || (days[i - 1]! + 1) % 7 === d);
  const dayText =
    days.length === 7
      ? "every day"
      : days.length === 0
        ? "no work days"
        : contiguous && days.length > 2
          ? `${WEEKDAY_NAMES[days[0]!]}–${WEEKDAY_NAMES[days[days.length - 1]!]}`
          : days.map((d) => WEEKDAY_NAMES[d]).join(", ");
  return `${shift.start}–${shift.end}, ${dayText}`;
}

export const stateLabels: Record<PresenceState, string> = {
  active: "Active",
  idle: "Idle",
  away: "In the background",
};

/** Status colours, always shown with a text label too. */
export const statusConfig: Record<PresenceStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "#10B981" },
  idle: { label: "Idle", color: "#FBBF24" },
  offline: { label: "Offline", color: "#A1A1AA" },
};

export const stateColors: Record<PresenceState, string> = {
  active: "#10B981",
  idle: "#FBBF24",
  away: "#A1A1AA",
};

export const endReasonLabels: Record<SessionEndReason, string> = {
  logout: "Signed out",
  idle_timeout: "Auto sign-out (inactive)",
  closed: "App closed / connection lost",
  password_changed: "Password changed",
  deactivated: "Account deactivated",
};

/** "2026-10" → "October 2026" */
export function monthName(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function shiftMonth(month: string, amount: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + amount, 1)).toISOString().slice(0, 7);
}
