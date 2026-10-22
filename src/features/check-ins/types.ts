import type { UserRole } from "@/features/users/types";

/** Mirrors the API (server/src/modules/check-ins). */
export type CheckInStatus = "not_checked_in" | "working" | "on_break" | "checked_out";

export interface CheckInLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export interface CheckInRecord {
  id: string;
  user: string;
  day: string;
  shiftStart: string;
  shiftEnd: string;
  isWorkDay: boolean;
  checkInAt: string | null;
  checkInLocation: CheckInLocation | null;
  checkOutAt: string | null;
  checkOutLocation: CheckInLocation | null;
  breaks: { startedAt: string; endedAt: string | null }[];
  lateMinutes: number | null;
  source: "web" | "mobile" | null;
  status: CheckInStatus;
  /** Check-in to check-out within the shift, minus breaks */
  workedMs: number;
  breakMs: number;
  notCheckedOut: boolean;
}

/** `GET /check-ins/me` */
export interface MyCheckIn {
  required: boolean;
  day?: string;
  timeZone?: string;
  shift?: { start: string; end: string; isWorkDay: boolean; startAt: string; endAt: string };
  status: CheckInStatus | null;
  record: CheckInRecord | null;
}

export interface CheckInBoardRow {
  user: { id: string; name: string; email: string; role: UserRole; department: string | null };
  shift: { start: string; end: string; isWorkDay: boolean };
  status: CheckInStatus;
  record: CheckInRecord | null;
}

/** `GET /check-ins/board` */
export interface CheckInBoard {
  date: string;
  today: string;
  timeZone: string;
  summary: { expected: number; checkedIn: number; late: number; onBreak: number; checkedOut: number };
  rows: CheckInBoardRow[];
}

export const checkInStatusLabels: Record<CheckInStatus, string> = {
  not_checked_in: "Not checked in",
  working: "Working",
  on_break: "On break",
  checked_out: "Checked out",
};
