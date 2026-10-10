import { useQuery } from "@tanstack/react-query";

import type { PlanDefinition, PlanKey } from "@/features/plans/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/billing). The app shows billing; paying happens on the website. */
export type PaymentMethod = "jazzcash" | "easypaisa" | "bank_transfer";
export type InvoiceStatus = "open" | "paid" | "void";
export type InvoiceKind = "renewal" | "plan_change" | "manual";
export type PaymentStatus = "pending" | "approved" | "rejected";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank_transfer: "Bank transfer",
};
export const invoiceStatusLabels: Record<InvoiceStatus, string> = { open: "Unpaid", paid: "Paid", void: "Cancelled" };
export const invoiceKindLabels: Record<InvoiceKind, string> = {
  renewal: "Renewal",
  plan_change: "Plan chosen",
  manual: "By Heapware",
};
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  rejected: "Rejected",
};

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  paidOn: string;
  status: PaymentStatus;
  rejectionReason?: string;
}

export interface Invoice {
  id: string;
  number: string;
  kind: InvoiceKind;
  plan: PlanKey;
  months: number;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAt?: string;
  note?: string;
  payments?: Payment[];
}

export interface BillingOverview {
  plan: PlanKey;
  billingStatus: "trial" | "paid";
  trialEndsAt: string | null;
  paidUntil: string | null;
  currency: string;
  prices: Record<PlanKey, number>;
  plans?: PlanDefinition[];
  invoices: Invoice[];
}

/** "PKR 4,999", same as the website. */
export function formatMoney(amount: number, currency = "PKR") {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

/** An unpaid invoice past its due date. */
export function isOverdue(invoice: Pick<Invoice, "status" | "dueDate">) {
  return invoice.status === "open" && new Date(invoice.dueDate).getTime() < Date.now();
}

/** Owners and admins: plan, prices and invoices. */
export function useBillingOverview() {
  return useQuery({ queryKey: ["billing"], queryFn: () => apiClient.get<BillingOverview>("/billing") });
}
