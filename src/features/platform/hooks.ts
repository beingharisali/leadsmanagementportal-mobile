import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { BillingStatus, OrganizationStatus, OrganizationSummary } from "@/features/organizations/types";
import type { PlanDefinition, PlanFeature, PlanKey } from "@/features/plans/types";
import type { UserRole } from "@/features/users/types";
import { apiClient, apiUrl, authHeaders, type Paginated } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { nextPage } from "@/lib/infinite";

/** Heapware's platform console (platform admins only). Mirrors server/src/modules/platform, billing, plans, support, announcements. */

// ---- Companies ----

export interface PlatformOrganization extends OrganizationSummary {
  source: "signup" | "platform" | "migration";
  usage: { users: number; activeUsers: number; leads: number; storageBytes: number; lastLoginAt: string | null };
  /** Why its users can't sign in right now (suspended), or null */
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOrganizationDetail extends PlatformOrganization {
  admins: { id: string; name: string; email: string; role: UserRole; phone: string | null; isActive: boolean; lastLoginAt: string | null }[];
}

export interface PlatformStats {
  total: number;
  active: number;
  suspended: number;
  trialing: number;
  trialExpired: number;
  paid: number;
  overdue: number;
  byPlan: Record<PlanKey, number>;
}

export interface PlatformOverview {
  companies: PlatformStats;
  newThisMonth: number;
  signupsThisMonth: number;
  activeUsers: number;
  leads: number;
  trialsEndingSoon: PlatformOrganization[];
  recentCompanies: PlatformOrganization[];
}

export interface OrganizationListParams {
  search?: string;
  status?: OrganizationStatus;
  plan?: PlanKey;
  billingStatus?: BillingStatus;
}

export interface CreateOrganizationPayload {
  name: string;
  plan: PlanKey;
  billingStatus: BillingStatus;
  trialEndsAt?: string;
  paidUntil?: string;
  admin: { name: string; email: string; phone?: string; password: string };
}

export interface UpdateOrganizationPayload {
  name?: string;
  status?: OrganizationStatus;
  plan?: PlanKey;
  billingStatus?: BillingStatus;
  /** `null` starts a fresh trial */
  trialEndsAt?: string | null;
  /** `null` = paid with no end date */
  paidUntil?: string | null;
}

const platformKeys = { all: ["platform"] as const };

function useRefreshPlatform() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: platformKeys.all });
}

export function usePlatformOverview() {
  return useQuery({ queryKey: [...platformKeys.all, "overview"], queryFn: () => apiClient.get<PlatformOverview>("/platform/overview") });
}

export function usePlatformOrganizations(params: OrganizationListParams) {
  return useInfiniteQuery({
    queryKey: [...platformKeys.all, "organizations", params],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<PlatformOrganization>("/platform/organizations", { ...params, page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<PlatformOrganization>) => nextPage(last),
  });
}

export function usePlatformOrganization(id: string) {
  return useQuery({
    queryKey: [...platformKeys.all, "organization", id],
    queryFn: () => apiClient.get<PlatformOrganizationDetail>(`/platform/organizations/${id}`),
  });
}

export function useCreateOrganization() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: (payload: CreateOrganizationPayload) => apiClient.post<PlatformOrganizationDetail>("/platform/organizations", payload),
    onSuccess: refresh,
  });
}

export function useUpdateOrganization() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationPayload }) =>
      apiClient.patch<PlatformOrganizationDetail>(`/platform/organizations/${id}`, payload),
    onSuccess: refresh,
  });
}

/**
 * Deletes a company and all its data for good; `confirmName` must match its name.
 * Refreshes everything except the deleted company's own page, which the caller leaves.
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) =>
      apiClient.post<{ id: string; name: string }>(`/platform/organizations/${id}/delete`, { confirmName }),
    onSuccess: (_result, { id }) =>
      void queryClient.invalidateQueries({
        queryKey: platformKeys.all,
        predicate: (query) => !(query.queryKey[1] === "organization" && query.queryKey[2] === id),
      }),
  });
}

/** Rebuilds the public demo now (it also resets itself every night). */
export function useResetDemo() {
  const refresh = useRefreshPlatform();
  return useMutation({ mutationFn: () => apiClient.post<{ resetAt: string | null }>("/platform/demo/reset"), onSuccess: refresh });
}

// ---- Announcements ----

export type AnnouncementLevel = "info" | "success" | "warning";
export const announcementLevelLabels: Record<AnnouncementLevel, string> = {
  info: "Information",
  success: "Good news",
  warning: "Important",
};

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  plans: PlanKey[];
  startsAt: string;
  endsAt?: string;
  emailed: boolean;
  emailedCount: number;
  dismissedCount: number;
  live: boolean;
  createdAt: string;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  level: AnnouncementLevel;
  plans: PlanKey[];
  endsAt?: string | null;
  sendEmail?: boolean;
}

export function usePlatformAnnouncements() {
  return useQuery({
    queryKey: [...platformKeys.all, "announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/platform/announcements"),
  });
}

export function useCreateAnnouncement() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => apiClient.post<Announcement>("/platform/announcements", payload),
    onSuccess: refresh,
  });
}

export function useUpdateAnnouncement() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AnnouncementPayload> }) =>
      apiClient.patch<Announcement>(`/platform/announcements/${id}`, payload),
    onSuccess: refresh,
  });
}

export function useDeleteAnnouncement() {
  const refresh = useRefreshPlatform();
  return useMutation({ mutationFn: (id: string) => apiClient.delete<null>(`/platform/announcements/${id}`), onSuccess: refresh });
}

// ---- Support sessions ----

export interface SupportSession {
  id: string;
  platformAdminName: string;
  organization: string;
  organizationName: string;
  user: string;
  userName: string;
  userEmail: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  endReason?: "exited" | "signed_out" | "expired";
  ip?: string;
}

export function useSupportSessions() {
  return useInfiniteQuery({
    queryKey: [...platformKeys.all, "support-sessions"],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<SupportSession>("/platform/support-sessions", { page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<SupportSession>) => nextPage(last),
  });
}

/** Starts a session; the result carries the token that signs in as the customer (read-only, up to an hour). */
export function startSupportSession(payload: { organizationId: string; userId?: string; reason: string }) {
  return apiClient.post<{ session: SupportSession; token: string }>("/platform/support-sessions", payload);
}

// ---- Plans ----

export interface PlanSettings {
  plans: PlanDefinition[];
  defaults: PlanDefinition[];
  updatedAt: string | null;
}

export function usePlanSettings() {
  return useQuery({ queryKey: [...platformKeys.all, "plans"], queryFn: () => apiClient.get<PlanSettings>("/platform/plans") });
}

export function useUpdatePlanSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plans: Record<PlanKey, { description: string; limits: PlanDefinition["limits"]; features: PlanFeature[] }>) =>
      apiClient.put<PlanSettings>("/platform/plans", plans),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
      // Heapware's own company may be on one of these plans.
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// ---- Billing ----

export type PaymentMethod = "jazzcash" | "easypaisa" | "bank_transfer";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type InvoiceStatus = "open" | "paid" | "void";

export interface PaymentDetails {
  jazzcash: { accountTitle: string; accountNumber: string };
  easypaisa: { accountTitle: string; accountNumber: string };
  bank: { bankName: string; accountTitle: string; accountNumber: string; iban: string };
}

export interface BillingSettings {
  prices: Record<PlanKey, number>;
  currency: string;
  invoiceDaysBefore: number;
  reminderDays: number[];
  paymentDetails: PaymentDetails;
}

export interface BillingStats {
  currency: string;
  monthlyRecurring: number;
  revenueThisMonth: number;
  pendingPayments: number;
  openInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;
}

type CompanyRef = { id: string; name: string; slug: string; plan: PlanKey; billingStatus: BillingStatus };

export interface PlatformPayment {
  id: string;
  invoice:
    | string
    | { id: string; number: string; plan: PlanKey; amount: number; months: number; status: InvoiceStatus; dueDate: string; kind: string };
  method: PaymentMethod;
  amount: number;
  reference: string;
  paidOn: string;
  note?: string;
  proof: { fileName: string; contentType: string; size: number };
  submittedBy: { id: string; name: string; email?: string } | null;
  status: PaymentStatus;
  reviewedBy?: { id: string; name: string } | null;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  organization?: CompanyRef;
}

export interface PlatformInvoice {
  id: string;
  number: string;
  kind: "renewal" | "plan_change" | "manual";
  plan: PlanKey;
  months: number;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAt?: string;
  note?: string;
  organization?: CompanyRef;
}

export function useBillingStats() {
  return useQuery({ queryKey: [...platformKeys.all, "billing-stats"], queryFn: () => apiClient.get<BillingStats>("/platform/billing/stats") });
}

export function useBillingSettings() {
  return useQuery({
    queryKey: [...platformKeys.all, "billing-settings"],
    queryFn: () => apiClient.get<BillingSettings>("/platform/billing/settings"),
  });
}

export function useUpdateBillingSettings() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: (payload: Partial<Omit<BillingSettings, "currency">>) =>
      apiClient.patch<BillingSettings>("/platform/billing/settings", payload),
    onSuccess: refresh,
  });
}

/** `search`: a payment reference (from the search screen). */
export function usePlatformPayments(status: PaymentStatus, search?: string) {
  return useInfiniteQuery({
    queryKey: [...platformKeys.all, "payments", status, search],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<PlatformPayment>("/platform/billing/payments", { status, search, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<PlatformPayment>) => nextPage(last),
  });
}

/** Downloads a customer's receipt (signed in) to the cache and opens the share sheet to view or save it. */
export async function openPaymentProof(payment: PlatformPayment) {
  const target = new File(Paths.cache, `proof-${payment.id}-${payment.proof.fileName.replace(/[\\/]/g, "_")}`);
  if (!target.exists) {
    await File.downloadFileAsync(apiUrl(`/platform/billing/payments/${payment.id}/proof`), target, {
      headers: authHeaders(),
      idempotent: true,
    });
  }
  await Sharing.shareAsync(target.uri, { mimeType: payment.proof.contentType, dialogTitle: payment.proof.fileName });
}

export function useApprovePayment() {
  const refresh = useRefreshPlatform();
  return useMutation({ mutationFn: (id: string) => apiClient.post<PlatformPayment>(`/platform/billing/payments/${id}/approve`), onSuccess: refresh });
}

export function useRejectPayment() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<PlatformPayment>(`/platform/billing/payments/${id}/reject`, { reason }),
    onSuccess: refresh,
  });
}

export interface InvoiceFilter {
  /** Invoice number (from the search screen) */
  search?: string;
  status?: InvoiceStatus;
  overdue?: boolean;
  organizationId?: string;
}

export function usePlatformInvoices(filter: InvoiceFilter) {
  return useInfiniteQuery({
    queryKey: [...platformKeys.all, "invoices", filter],
    queryFn: ({ pageParam }) =>
      apiClient.getPaginated<PlatformInvoice>("/platform/billing/invoices", { ...filter, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<PlatformInvoice>) => nextPage(last),
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvoice() {
  const refresh = useRefreshPlatform();
  return useMutation({
    mutationFn: (payload: { organizationId: string; plan: PlanKey; months: number; amount?: number; dueDate?: string; note?: string }) =>
      apiClient.post<PlatformInvoice>("/platform/billing/invoices", payload),
    onSuccess: refresh,
  });
}

export function useVoidInvoice() {
  const refresh = useRefreshPlatform();
  return useMutation({ mutationFn: (id: string) => apiClient.post<PlatformInvoice>(`/platform/billing/invoices/${id}/void`), onSuccess: refresh });
}

// ---- Shared helpers ----

export const BILLING_STATUSES: BillingStatus[] = ["trial", "paid"];
export const billingStatusLabels: Record<BillingStatus, string> = { trial: "Free trial", paid: "Paid" };

/** "Trial · 5 days left" / "Paid until 3 Nov" / "Payment was due 1 Oct", as the website's plan column. */
export function billingLine(organization: Pick<PlatformOrganization, "billingStatus" | "trialEndsAt" | "paidUntil" | "readOnly">) {
  const daysLeft = trialDaysLeft(organization);
  if (organization.billingStatus === "trial" && organization.trialEndsAt) {
    return daysLeft ? `Trial · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : `Trial ended ${formatDate(organization.trialEndsAt)}`;
  }
  if (organization.paidUntil) return `${organization.readOnly ? "Payment was due" : "Paid until"} ${formatDate(organization.paidUntil)}`;
  return billingStatusLabels[organization.billingStatus];
}

/** Whole days until a trial ends (0 = today), or null when it's not on a trial. */
export function trialDaysLeft(organization: Pick<OrganizationSummary, "billingStatus" | "trialEndsAt">) {
  if (organization.billingStatus !== "trial" || !organization.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

/** A picked day → the end of that local day, as ISO (same as the website). */
export function endOfDayIso(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}
