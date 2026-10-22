import type { Activity } from "@/features/activities/types";
import type { UserRole } from "@/features/users/types";
import type { UserSummary } from "@/types/api";

/** Mirrors the API (server/src/modules/tracking), same as client/features/tracking/types.ts. */
export type PresenceState = "active" | "idle" | "away";
export type PresenceStatus = "online" | "idle" | "offline";

export type SessionEndReason =
  | "logout"
  | "idle_timeout"
  | "closed"
  | "password_changed"
  | "deactivated";

export interface StateTotals {
  activeMs: number;
  idleMs: number;
  awayMs: number;
}

export interface LeadRef {
  id: string;
  label: string;
  isDeleted?: boolean;
}

export interface PresenceRow {
  user: { id: string; name: string; email: string; role: UserRole };
  status: PresenceStatus;
  state: PresenceState | null;
  signedIn: boolean;
  lastSeenAt: string | null;
  currentLead: LeadRef | null;
  device: string | null;
  ip: string | null;
  sessionStartedAt: string | null;
  today: StateTotals & { firstSeenAt: string | null };
}

/** The organization's working hours, from its tracking settings. */
export interface Shift {
  /** "HH:MM" */
  start: string;
  end: string;
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
}

/** First sign-in / last sign-out against the shift; `null` when on time or not comparable. */
export interface ShiftCompliance {
  isWorkDay: boolean;
  lateMinutes: number | null;
  leftEarlyMinutes: number | null;
}

export interface PresenceBoard {
  generatedAt: string;
  timeZone: string;
  date: string;
  shift: Shift;
  users: PresenceRow[];
}

export interface Session {
  id: string;
  user: string | UserSummary;
  startedAt: string;
  endedAt?: string;
  endReason?: SessionEndReason;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
  lastSeenAt: string;
  lastActiveAt: string;
  state: PresenceState;
}

export interface TimelineSegment {
  state: PresenceState;
  startedAt: string;
  endedAt: string;
  lead: LeadRef | null;
}

export interface LeadTime {
  lead: LeadRef;
  activeMs: number;
  idleMs: number;
  views: number;
  lastViewedAt: string | null;
}

export interface AgentDay {
  user: { id: string; name: string; email: string; role: UserRole; isActive: boolean };
  date: string;
  today: string;
  timeZone: string;
  shift: Shift;
  summary: StateTotals & ShiftCompliance & {
    loggedInMs: number;
    firstLoginAt: string | null;
    lastLogoutAt: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    signedInNow: boolean;
    leadViews: number;
    leadsViewed: number;
    actions: number;
  };
  timeline: TimelineSegment[];
  sessions: Session[];
  leads: LeadTime[];
  activities: Activity[];
}

/** A day's check-in, when the company has "Check-in & attendance" (same as the website). */
export interface CheckInDayFields {
  checkInAt: string | null;
  checkOutAt: string | null;
  checkedInMs: number;
  breakMs: number;
  notCheckedOut: boolean;
  breaks: { startedAt: string; endedAt: string | null }[];
}

export interface TimesheetRow extends StateTotals, ShiftCompliance, Partial<CheckInDayFields> {
  user: { id: string; name: string; isActive: boolean };
  /** Set when this person works their own hours rather than the company's */
  customShift: Shift | null;
  date: string;
  loggedInMs: number;
  firstLoginAt: string | null;
  lastLogoutAt: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  leadViews: number;
  actions: number;
}

export interface Timesheet {
  from: string;
  to: string;
  today: string;
  timeZone: string;
  shift: Shift;
  rows: TimesheetRow[];
}

export type AttendanceStatus = "present" | "late" | "absent" | "day_off" | "upcoming";

export interface AttendanceDay {
  date: string;
  status: AttendanceStatus;
  isWorkDay: boolean;
  loggedInMs: number;
  lateMinutes: number | null;
  leftEarlyMinutes: number | null;
}

export interface AttendanceRow {
  user: { id: string; name: string; isActive: boolean };
  shift: Shift & { custom: boolean };
  days: AttendanceDay[];
  summary: { workDays: number; present: number; late: number; absent: number; leftEarly: number; daysOff: number };
}

export interface Attendance {
  month: string;
  today: string;
  timeZone: string;
  shift: Shift;
  days: string[];
  rows: AttendanceRow[];
}

