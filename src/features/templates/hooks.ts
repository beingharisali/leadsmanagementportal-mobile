import { useQuery } from "@tanstack/react-query";

import type { Lead } from "@/features/leads/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/templates). Templates are written on the website. */
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
