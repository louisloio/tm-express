import { OcrsBand, OcrsScore } from "@prisma/client";

// Mirrors web/src/lib/ocrs.ts's band ranking — kept separate since the two
// don't share a build, but the logic must stay identical.
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

export function compareToPrevious(
  current: Pick<OcrsScore, "roadworthinessScore" | "trafficScore" | "band">,
  previous: Pick<OcrsScore, "roadworthinessScore" | "trafficScore" | "band"> | null
): Movement {
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
