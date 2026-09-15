import { OcrsBand, OcrsScore } from "./api";

// Rank for comparing risk direction. GREY (not yet enough data) and BLUE
// (exempt) aren't part of the Green/Amber/Red risk ladder, so they're never
// treated as a worsening/improving move either way.
const BAND_RANK: Record<OcrsBand, number> = {
  GREEN: 0,
  AMBER: 1,
  RED: 2,
  GREY: -1,
  BLUE: -1,
};

export interface Movement {
  worsened: boolean;
  reasons: string[];
}

export function compareToPrevious(current: OcrsScore, previous: OcrsScore | null): Movement {
  if (!previous) return { worsened: false, reasons: [] };

  const reasons: string[] = [];
  if (current.roadworthinessScore > previous.roadworthinessScore) {
    reasons.push("roadworthiness score increased");
  }
  if (current.trafficScore > previous.trafficScore) {
    reasons.push("traffic score increased");
  }
  const currentRank = BAND_RANK[current.band];
  const previousRank = BAND_RANK[previous.band];
  if (currentRank >= 0 && previousRank >= 0 && currentRank > previousRank) {
    reasons.push(`band moved ${previous.band} → ${current.band}`);
  }

  return { worsened: reasons.length > 0, reasons };
}

export const bandLabel: Record<OcrsBand, string> = {
  GREEN: "Green",
  AMBER: "Amber",
  RED: "Red",
  GREY: "Grey (not yet scored)",
  BLUE: "Blue (exempt)",
};
