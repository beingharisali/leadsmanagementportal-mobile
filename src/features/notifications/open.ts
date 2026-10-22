import { router } from "expo-router";

import { linkParams } from "@/lib/link-params";

import type { NotificationType } from "./types";

/**
 * Where an alert leads: its lead, or a list that fits what it's about (same
 * as the website). Used by the Alerts tab and when a push notification is tapped.
 */
export function openNotificationTarget({
  type,
  lead,
  task,
  project,
}: {
  type: NotificationType;
  lead?: string | null;
  task?: string | null;
  project?: string | null;
}) {
  if (task) return router.push({ pathname: "/tasks/[id]", params: { id: task } });
  if (type === "check_in_late" || type === "check_in_missing") return router.push("/check-ins");
  if (project) return router.push({ pathname: "/projects/[id]", params: { id: project } });
  if (lead) return router.push({ pathname: "/leads/[id]", params: { id: lead } });
  if (type === "stale_leads") return router.navigate({ pathname: "/leads", params: linkParams({ stale: "true" }) });
  if (type === "lead_expired") return router.navigate({ pathname: "/leads", params: linkParams({ assignedTo: "unassigned" }) });
  if (type === "reassignment_requested") return router.push("/handovers");
  router.navigate("/follow-ups");
}
