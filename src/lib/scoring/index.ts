import { scoringConfig, type ScoringConfig } from "@config/scoring";

import { computeDigitalHealth } from "./digital-health";
import { computeOpportunity } from "./opportunity";
import { suggestServices } from "./services";
import { computeTrafficLight } from "./traffic-light";
import type { BusinessScore, ScoringInput } from "./types";

export function scoreBusiness(
  input: ScoringInput,
  cfg: ScoringConfig = scoringConfig,
): BusinessScore {
  const digitalHealth = computeDigitalHealth(input, cfg);
  const opportunity = computeOpportunity(input, digitalHealth.score, cfg);
  return {
    digitalHealth,
    opportunity,
    trafficLight: computeTrafficLight(input, digitalHealth.score, cfg),
    services: suggestServices(input, cfg),
    configVersion: cfg.version,
  };
}

export * from "./types";
export { computeDigitalHealth } from "./digital-health";
export { computeOpportunity, hasAnySocial } from "./opportunity";
export { computeTrafficLight } from "./traffic-light";
export { suggestServices } from "./services";
export { median } from "./math";
