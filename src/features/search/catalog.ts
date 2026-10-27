import type Ionicons from "@expo/vector-icons/Ionicons";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";

import { moreSectionsFor, type WorkAccessFlags } from "@/config/navigation";
import type { PlanFeature } from "@/features/plans/types";
import { worksLeads, type User } from "@/features/users/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** One feature the search screen can take you to. */
export interface FeatureResult {
  title: string;
  /** Where it lives, e.g. "Settings" */
  section: string;
  href: Href;
  icon: IconName;
  /** Other words people may type for it */
  keywords: string;
  /** The plan feature it needs; `locked` when the company doesn't have it */
  feature?: PlanFeature;
  locked: boolean;
}

/** Other words for each screen, by its link. */
const KEYWORDS: Record<string, string> = {
  "/": "home dashboard overview stats summary",
  "/leads": "my leads all leads customers clients contacts add lead new lead",
  "/follow-ups": "reminders callbacks call back schedule due today overdue",
  "/notifications": "alerts notifications inbox",
  "/account": "profile password change password my account name email sign out",
  "/tasks": "to do todo work assign task my tasks approval review",
  "/projects": "clients project work",
  "/task-reports": "task report work report productivity",
  "/departments": "teams department head shifts",
  "/pipeline": "kanban board stages deals sales funnel move stage",
  "/team": "team members staff employees users people add member invite roles deactivate offboard delete user",
  "/handovers": "handover transfer reassign leads requests",
  "/monitoring": "live status online who is working idle view as agent monitoring",
  "/check-ins": "check in check out break attendance late absent location",
  "/timesheets": "hours attendance working time login logout daily",
  "/performance": "leaderboard targets report agents ranking conversion",
  "/activity": "activity feed audit log history changes",
  "/leads/import": "upload excel csv spreadsheet bulk add import",
  "/recycle-bin": "trash deleted restore recover bin",
  "/settings/company": "company name logo details",
  "/settings/pipeline": "stages statuses rename reorder colours colors pipeline settings",
  "/settings/sources": "source lead source",
  "/settings/custom-fields": "custom fields extra details",
  "/settings/tags": "tags labels",
  "/settings/lost-reasons": "lost reason",
  "/settings/tracking": "idle auto logout sign out working hours time zone shift tracking",
  "/settings/team-rules": "targets goals stale leads daily email team rules",
  "/settings/templates": "whatsapp email templates messages",
  "/settings/plan": "plan upgrade limits usage subscription",
  "/settings/billing": "pay payment invoice billing receipt renew",
  "/console": "console overview platform admin heapware",
  "/console/companies": "customers organizations tenants accounts suspend extend trial create company",
  "/console/announcements": "news banner message broadcast",
  "/console/support": "support login sign in as customer sessions log",
  "/console/plans": "plan limits features pricing starter growth business",
  "/console/payments": "receipts approve reject jazzcash easypaisa bank transfer",
  "/console/invoices": "bills billing due unpaid overdue cancel invoice",
  "/console/billing-settings": "bank account jazzcash easypaisa prices currency",
};

const keywordsOf = (href: Href) => (typeof href === "string" ? (KEYWORDS[href] ?? "") : "");

/**
 * Every feature this person can use, as the tabs and the More tab decide it
 * (role, work access, Heapware staff), plus their account. Features their
 * company's plan doesn't include are kept, marked `locked`.
 */
export function featuresFor(user: User, work: WorkAccessFlags | undefined): FeatureResult[] {
  const features = user.organization?.features;
  const isLocked = (feature?: PlanFeature) => !!feature && !!features && !features.includes(feature);

  const tab = (title: string, href: Href, icon: IconName): FeatureResult => ({
    title,
    section: "Tabs",
    href,
    icon,
    keywords: keywordsOf(href),
    locked: false,
  });
  const results: FeatureResult[] = [tab("Home", "/", "home-outline")];
  if (worksLeads(user.role)) {
    results.push(
      tab(user.role === "agent" ? "My Leads" : "Leads", "/leads", "people-outline"),
      tab("Follow-ups", "/follow-ups", "alarm-outline"),
    );
  }
  results.push(tab("Alerts", "/notifications", "notifications-outline"), {
    ...tab("My account", "/account", "person-circle-outline"),
    section: "Account",
  });

  const toResult = (section: string, item: ReturnType<typeof moreSectionsFor>[number]["items"][number], locked: boolean) =>
    item.href
      ? [{ title: item.title, section, href: item.href, icon: item.icon, keywords: keywordsOf(item.href), feature: item.feature, locked }]
      : [];

  for (const section of moreSectionsFor(user, work)) {
    for (const item of section.items) results.push(...toResult(section.label, item, isLocked(item.feature)));
  }

  // Without work management, the owner still finds the work screens, locked (an upgrade hint).
  if (user.role === "owner" && features && !features.includes("workManagement")) {
    const all = moreSectionsFor(user, { tasks: true, departments: true, taskReports: true });
    for (const section of all.filter((s) => s.label === "Work")) {
      for (const item of section.items) {
        results.push(...toResult(section.label, item, true).map((r) => ({ ...r, feature: "workManagement" as const })));
      }
    }
  }
  return results;
}

/**
 * Features matching `q`: every word must appear in the title, section or
 * keywords. Title matches come first, best when the title starts with it.
 */
export function matchFeatures(all: FeatureResult[], q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return all;
  const phrase = words.join(" ");
  const score = (f: FeatureResult) => {
    const title = f.title.toLowerCase();
    const haystack = `${title} ${f.section} ${f.keywords}`.toLowerCase();
    if (!words.every((w) => haystack.includes(w))) return -1;
    if (title.startsWith(phrase)) return 3;
    if (title.includes(phrase)) return 2;
    if (words.every((w) => title.includes(w))) return 1;
    return 0;
  };
  return all
    .map((feature, index) => ({ feature, index, score: score(feature) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.feature);
}
