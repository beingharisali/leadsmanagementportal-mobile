import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

import type { FollowUpType } from "./types";

/**
 * Follow-up dates are stored in UTC; everything here works in the phone's
 * local time so "today" means the agent's day. Mirrors client/features/follow-ups/format.ts.
 */

export type FollowUpState = "overdue" | "today" | "upcoming";

export const followUpTypeLabels: Record<FollowUpType, string> = {
  call: "Call",
  meeting: "Meeting",
  message: "Message",
};

export const followUpTypeIcons: Record<FollowUpType, ComponentProps<typeof Ionicons>["name"]> = {
  call: "call-outline",
  meeting: "calendar-outline",
  message: "chatbubble-outline",
};

/** Start and end of the local day containing `now`, as ISO strings for the API. */
export function localDayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(date: Date, now: Date) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function getFollowUpState(at: string | Date, now = new Date()): FollowUpState {
  const date = new Date(at);
  if (date.getTime() <= now.getTime()) return "overdue";
  return dayDiff(date, now) === 0 ? "today" : "upcoming";
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** "Today, 3:00 pm" · "Tomorrow, 11:00 am" · "Mon 6 Oct, 11:00 am" */
export function formatFollowUpDate(at: string | Date, now = new Date()) {
  const date = new Date(at);
  const days = dayDiff(date, now);
  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : days === -1
          ? "Yesterday"
          : date.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
            });
  return `${day}, ${formatTime(date)}`;
}

/** Short label for badges: "Overdue 2 days", "Due now", "In 3 days". */
export function formatFollowUpRelative(at: string | Date, now = new Date()) {
  const date = new Date(at);
  const diffMs = date.getTime() - now.getTime();
  const days = dayDiff(date, now);

  if (diffMs <= 0) {
    const mins = Math.floor(-diffMs / 60_000);
    if (mins < 1) return "Due now";
    if (days === 0) return mins < 60 ? `Overdue ${mins} min` : `Overdue ${Math.floor(mins / 60)} h`;
    return `Overdue ${-days} day${days === -1 ? "" : "s"}`;
  }
  if (days === 0) {
    const mins = Math.ceil(diffMs / 60_000);
    return mins < 60 ? `In ${mins} min` : `Today ${formatTime(date)}`;
  }
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** One-tap date presets when scheduling. */
export const FOLLOW_UP_PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

/** `days` from today at the same time as `time` (or 11:00 when that's already past today). */
export function presetDate(days: number, time: Date) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  if (d.getTime() <= Date.now()) d.setTime(Date.now() + 60 * 60_000);
  return d;
}

/** The default for a new follow-up: tomorrow at 11 am. */
export function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  return d;
}
