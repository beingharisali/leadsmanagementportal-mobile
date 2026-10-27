import type { InvoiceStatus, PaymentStatus } from "@/features/billing/hooks";
import type { OrganizationStatus } from "@/features/organizations/types";
import type { PlanKey } from "@/features/plans/types";
import type { ProjectStatus } from "@/features/projects/types";
import type { TaskStatus } from "@/features/tasks/types";
import type { UserRole } from "@/features/users/types";

/** `GET /search`: up to 5 of each kind of record the person can open (mirrors the API). */
export interface WorkspaceSearchResults {
  leads: { id: string; name: string; businessName: string | null; phone: string | null; status: string }[];
  people: { id: string; name: string; email: string; role: UserRole; isActive: boolean }[];
  tasks: { id: string; title: string; status: TaskStatus }[];
  projects: { id: string; name: string; clientName: string | null; status: ProjectStatus }[];
  departments: { id: string; name: string; memberCount: number }[];
}

/** `GET /platform/search`: companies, invoices and payments (Heapware staff). */
export interface PlatformSearchResults {
  companies: { id: string; name: string; slug: string; plan: PlanKey; status: OrganizationStatus }[];
  invoices: { id: string; number: string; status: InvoiceStatus; amount: number; currency: string; company: string | null }[];
  payments: {
    id: string;
    reference: string;
    status: PaymentStatus;
    amount: number;
    company: string | null;
    invoiceNumber: string | null;
  }[];
}

/** Shortest text the server searches records for. */
export const MIN_SEARCH_LENGTH = 2;
