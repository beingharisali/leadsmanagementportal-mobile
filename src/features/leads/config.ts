import type { LeadRating, LeadSort, LeadTimeline } from "./types";

export const leadTimelineLabels: Record<LeadTimeline, string> = {
  immediately: "Immediately",
  within_1_month: "Within 1 month",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  "6_plus_months": "6+ months",
  not_sure: "Not sure yet",
};

export const leadRatingLabels: Record<LeadRating, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export const leadRatingColors = { hot: "rose", warm: "amber", cold: "sky" } as const;

export const leadSortLabels: Record<LeadSort, string> = {
  "-createdAt": "Newest first",
  "-updatedAt": "Recently updated",
  "-score": "Highest score",
  name: "Name (A–Z)",
};

export const BUSINESS_TYPES = [
  "Manufacturing",
  "Retail",
  "Wholesale",
  "Healthcare",
  "Education",
  "Logistics",
  "Real Estate",
  "Restaurant",
  "Textile",
  "Pharmacy",
  "Services",
  "Other",
];
