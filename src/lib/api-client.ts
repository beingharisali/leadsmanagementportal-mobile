import type { ApiErrorDetail, ApiResponse, PaginationMeta } from "@/types/api";

import { API_URL, USER_AGENT } from "./config";
import { getViewAs } from "./view-as";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: ApiErrorDetail[],
    /** Machine-readable reason, e.g. "PLAN_LIMIT_REACHED" or "ACCOUNT_READ_ONLY" */
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export type QueryParams = Record<string, string | number | boolean | string[] | null | undefined>;

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  /** Give up after this long. The free Render plan can take ~a minute to wake up. */
  timeoutMs?: number;
  /** As the signed-in user even while viewing as an agent (heartbeats, signing out) */
  asSelf?: boolean;
}

/**
 * The sign-in token for every request, kept in memory by the auth provider
 * (which also stores it in SecureStore).
 */
let authToken: string | null = null;
/** Called when the API says the sign-in is no longer valid (expired, signed out elsewhere, idle…). */
let onUnauthorized: ((message: string) => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: ((message: string) => void) | null) {
  onUnauthorized = handler;
}

/** Builds `?a=1&b=x,y`: empty values are skipped, arrays are comma-joined. */
function toQueryString(params?: QueryParams) {
  if (!params) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(","))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Fetch wrapper around the Heapware API, the same one the website uses.
 * Signs requests with `Authorization: Bearer`, unwraps the
 * `{ success, message, data }` envelope and throws `ApiClientError` on failure.
 */
async function request<T>(path: string, { method, body, params, timeoutMs = 60_000, asSelf }: RequestOptions) {
  const sentToken = authToken;
  // Viewing as an agent is read-only: the API refuses changes, so don't even send them.
  const viewAs = asSelf ? null : getViewAs();
  if (viewAs && method !== "GET") {
    throw new ApiClientError(`You're viewing as ${viewAs.name} (read-only). Exit view mode to make changes.`, 403);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${toQueryString(params)}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        ...(sentToken && { Authorization: `Bearer ${sentToken}` }),
        ...(viewAs && { "X-View-As": viewAs.id }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiClientError(
      controller.signal.aborted
        ? "The server is taking too long to answer. Please try again."
        : "Can't reach the server. Check your internet connection.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || !payload.success) {
    const error = new ApiClientError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload && !payload.success ? payload.errors : undefined,
      payload && !payload.success ? payload.code : undefined,
      payload && !payload.success ? payload.details : undefined,
    );
    // Only a signed request can lose its sign-in (a wrong password is a 401 too).
    if (response.status === 401 && sentToken && sentToken === authToken) onUnauthorized?.(error.message);
    throw error;
  }

  return payload;
}

/** Full URL of an API path, e.g. for downloading a file. */
export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

/** The headers every API request carries, for transfers that don't go through `fetch` (uploads, downloads). */
export function authHeaders(): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };
}

/**
 * Reads an API response body from a transfer done outside `request` (an
 * upload): returns the data or throws `ApiClientError`, the same way.
 */
export function readEnvelope<T>(status: number, body: string): T {
  let payload: ApiResponse<T> | null = null;
  try {
    payload = JSON.parse(body) as ApiResponse<T>;
  } catch {
    // Not JSON: e.g. a proxy error page
  }
  if (status >= 200 && status < 300 && payload?.success) return payload.data;
  const failure = payload && !payload.success ? payload : undefined;
  const error = new ApiClientError(
    failure?.message ?? `Request failed (${status})`,
    status,
    failure?.errors,
    failure?.code,
    failure?.details,
  );
  if (status === 401 && authToken) onUnauthorized?.(error.message);
  throw error;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export const apiClient = {
  async get<T>(path: string, params?: QueryParams, options?: { timeoutMs?: number }) {
    return (await request<T>(path, { method: "GET", params, ...options })).data;
  },
  async getPaginated<T>(path: string, params?: QueryParams): Promise<Paginated<T>> {
    const payload = await request<T[]>(path, { method: "GET", params });
    return { items: payload.data, meta: payload.meta! };
  },
  async post<T>(path: string, body?: unknown, options?: { timeoutMs?: number; asSelf?: boolean }) {
    return (await request<T>(path, { method: "POST", body, ...options })).data;
  },
  async put<T>(path: string, body?: unknown) {
    return (await request<T>(path, { method: "PUT", body })).data;
  },
  async patch<T>(path: string, body?: unknown) {
    return (await request<T>(path, { method: "PATCH", body })).data;
  },
  async delete<T>(path: string) {
    return (await request<T>(path, { method: "DELETE" })).data;
  },
};

/** Plan limits and features get their own explanation, so the short message stays short. */
const SHORT_MESSAGES: Record<string, string> = {
  PLAN_LIMIT_REACHED: "Your plan's limit is reached",
  FEATURE_NOT_IN_PLAN: "Not included in your plan",
};

/** Human-readable message for alerts and error states. */
export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code && SHORT_MESSAGES[error.code]) return SHORT_MESSAGES[error.code]!;
    const detail = error.errors?.[0]?.message;
    return detail && error.status !== 422 ? `${error.message}: ${detail}` : error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/** The first validation message for a form field, e.g. `fieldError(error, "email")`. */
export function fieldError(error: unknown, path: string) {
  if (!(error instanceof ApiClientError)) return undefined;
  return error.errors?.find((e) => e.path === path)?.message;
}
