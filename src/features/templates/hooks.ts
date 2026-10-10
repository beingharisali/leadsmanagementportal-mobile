import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Lead } from "@/features/leads/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/templates). Agents use templates; owners and admins write them. */
export type MessageChannel = "whatsapp" | "email";

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  /** Email only */
  subject?: string;
  body: string;
}

export function useTemplates(channel: MessageChannel | null) {
  return useQuery({
    queryKey: ["templates", channel],
    queryFn: () => apiClient.get<MessageTemplate[]>("/templates", { channel: channel ?? undefined }),
    staleTime: 5 * 60_000,
    enabled: !!channel,
  });
}

type TemplateValues = Record<string, string>;

/** The `{{placeholders}}` a template can use (same as the website). */
export function templateValues(
  lead: Pick<Lead, "name" | "businessName" | "phone" | "email" | "city">,
  agentName: string,
  companyName: string,
): TemplateValues {
  return {
    name: lead.name,
    first_name: lead.name.trim().split(/\s+/)[0] ?? lead.name,
    business: lead.businessName,
    phone: lead.phone,
    email: lead.email ?? "",
    city: lead.city ?? "",
    agent: agentName,
    company: companyName,
  };
}

/** Replaces `{{name}}`-style placeholders; unknown ones are left as they are. */
export function fillTemplate(text: string, values: TemplateValues) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => values[key.toLowerCase()] ?? match);
}

// ---- Managing templates (owners and admins) ----

export interface TemplatePayload {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
}

/** `{{placeholders}}` a template can use (same as the website). */
export const TEMPLATE_PLACEHOLDERS = [
  { key: "name", description: "Contact name" },
  { key: "first_name", description: "Contact's first name" },
  { key: "business", description: "Business name" },
  { key: "phone", description: "Contact phone" },
  { key: "email", description: "Contact email" },
  { key: "city", description: "City" },
  { key: "agent", description: "Your name" },
  { key: "company", description: "Your company" },
] as const;

export const channelLabels: Record<MessageChannel, string> = { whatsapp: "WhatsApp", email: "Email" };

/** Every template (both channels). */
export function useAllTemplates() {
  return useQuery({ queryKey: ["templates", "all"], queryFn: () => apiClient.get<MessageTemplate[]>("/templates") });
}

function useRefreshTemplates() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["templates"] });
}

export function useCreateTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: (payload: TemplatePayload) => apiClient.post<MessageTemplate>("/templates", payload),
    onSuccess: refresh,
  });
}

export function useUpdateTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplatePayload }) =>
      apiClient.patch<MessageTemplate>(`/templates/${id}`, payload),
    onSuccess: refresh,
  });
}

export function useDeleteTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({ mutationFn: (id: string) => apiClient.delete<null>(`/templates/${id}`), onSuccess: refresh });
}
