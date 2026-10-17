import { scoringConfig, type ScoringConfig } from "@config/scoring";
import type { TrafficLight } from "@/db/schema";

import { hasAnySocial } from "./opportunity";
import type { ScoringInput } from "./types";

export function computeTrafficLight(
  input: Pick<ScoringInput, "instagram" | "facebook" | "tiktok">,
  digitalHealth: number | null,
  cfg: ScoringConfig = scoringConfig,
): TrafficLight {
  if (!hasAnySocial(input)) return "no_social";
  if (digitalHealth === null) return "unknown";
  if (digitalHealth < cfg.trafficLight.red) return "red";
  if (digitalHealth < cfg.trafficLight.yellow) return "yellow";
  return "green";
}
