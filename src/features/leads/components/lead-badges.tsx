import { Badge } from "@/components/ui/badge";
import { useLeadOptions } from "@/features/customization/hooks";

import { leadRatingColors, leadRatingLabels } from "../config";
import type { LeadRating } from "../types";

export function StageBadge({ status }: { status: string }) {
  const { stageLabel, stageColor } = useLeadOptions();
  return <Badge label={stageLabel(status)} color={stageColor(status)} dot />;
}

export function RatingBadge({ rating, score }: { rating: LeadRating; score?: number }) {
  return (
    <Badge label={score === undefined ? leadRatingLabels[rating] : `${leadRatingLabels[rating]} · ${score}`} color={leadRatingColors[rating]} />
  );
}
