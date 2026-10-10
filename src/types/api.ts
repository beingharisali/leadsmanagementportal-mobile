/** Mirrors the response envelope produced by the Express backend. */
export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: ApiErrorDetail[];
  /** Machine-readable reason, e.g. "PLAN_LIMIT_REACHED" */
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** A user as embedded in other records (assignee, author…). */
export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  role?: "owner" | "admin" | "agent";
  isActive?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
