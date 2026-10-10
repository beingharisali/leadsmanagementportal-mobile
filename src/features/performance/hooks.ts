import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { TargetMetric } from "@/features/customization/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors the API (server/src/modules/performance). */
export type TargetProgress = Record<TargetMetric, { actual: number; target: number }>;

export interface TargetsReport {
  date: string;
  /** "2026-10" */
  month: string;
  timeZone: string;
  /** Whether any targets are set (team or per agent) */
  configured: boolean;
  rows: {
    user: { id: string; name: string; isActive: boolean };
    hasTargets: boolean;
    daily: TargetProgress;
    monthly: TargetProgress;
  }[];
}

export const LEADERBOARD_PERIODS = ["today", "week", "month"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const leaderboardPeriodLabels: Record<LeaderboardPeriod, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
};

export interface Leaderboard {
  period: LeaderboardPeriod;
  rows: {
    rank: number;
    user: { id: string; name: string };
    isMe: boolean;
    score: number;
    won: number;
    calls: number;
    followUpsDone: number;
  }[];
}

export const performanceKeys = {
  all: ["performance"] as const,
  targets: () => [...performanceKeys.all, "targets"] as const,
  leaderboard: (period: LeaderboardPeriod) => [...performanceKeys.all, "leaderboard", period] as const,
};

/** Agents: their own targets; managers: the team's. */
export function useTargets(enabled = true) {
  return useQuery({
    queryKey: performanceKeys.targets(),
    queryFn: () => apiClient.get<TargetsReport>("/performance/targets"),
    refetchInterval: 5 * 60_000,
    enabled,
  });
}

/** The team ranked by productivity score (plans with monitoring). */
export function useLeaderboard(period: LeaderboardPeriod, enabled = true) {
  return useQuery({
    queryKey: performanceKeys.leaderboard(period),
    queryFn: () => apiClient.get<Leaderboard>("/performance/leaderboard", { period }),
    enabled,
  });
}

/** One person's numbers over a period (server/src/modules/performance/performance.service.ts). */
export interface AgentPerformance {
  user: { id: string; name: string; isActive: boolean };
  /** Leads given to them in the period (and still theirs) */
  leadsAssigned: number;
  /** Leads they added themselves */
  leadsCreated: number;
  calls: number;
  /** Connected or asked to call back */
  callsReached: number;
  talkSeconds: number;
  messages: number;
  followUpsDone: number;
  stageMoves: number;
  won: number;
  wonValue: number;
  lost: number;
  /** `null` when nothing closed in the period */
  winRate: number | null;
  /** Right now, not limited to the period */
  openLeads: number;
  followUpsOverdue: number;
  activeMs: number;
}

export const SCORE_PARTS = ["activity", "results", "followUps", "activeTime"] as const;
export type ScorePart = (typeof SCORE_PARTS)[number];

export const scorePartLabels: Record<ScorePart, string> = {
  activity: "Activity (calls, messages, follow-ups)",
  results: "Results (deals won)",
  followUps: "Follow-ups kept on time",
  activeTime: "Active time vs. shift",
};

export interface ScoredAgent extends AgentPerformance {
  /** Productivity score, 0–100 */
  score: number;
  scoreParts: Record<ScorePart, number>;
}

export interface PerformanceReport {
  from: string;
  to: string;
  today: string;
  timeZone: string;
  rows: ScoredAgent[];
  totals: Omit<AgentPerformance, "user">;
  /** How much each part counts, out of 100 */
  scoreWeights: Record<ScorePart, number>;
}

/** Managers: every agent's results over a period ("YYYY-MM-DD" days). */
export function usePerformance(params: { from: string; to: string }) {
  return useQuery({
    queryKey: [...performanceKeys.all, "report", params],
    queryFn: () => apiClient.get<PerformanceReport>("/performance", params),
    placeholderData: keepPreviousData,
  });
}

/** Badge colour for a productivity score; same bands as the website's score badge. */
export function scoreColor(score: number) {
  if (score >= 75) return "emerald" as const;
  if (score >= 50) return "amber" as const;
  return "rose" as const;
}
