import { useQuery } from "@tanstack/react-query";

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
