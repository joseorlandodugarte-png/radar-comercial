import { scoringConfig, type ScoringConfig } from "@config/scoring";

import { reputationValue } from "./digital-health";
import { clamp01, combineFactors } from "./math";
import type { Factor, ScoreResult, ScoringInput } from "./types";

type PartialFactor = Omit<Factor, "points">;

export function hasAnySocial(input: Pick<ScoringInput, "instagram" | "facebook" | "tiktok">) {
  return Boolean(input.instagram || input.facebook || input.tiktok);
}

/** How well the business itself seems to be doing (0-1 factors), independent of social media. */
export function businessStrengthFactors(
  input: ScoringInput,
  cfg: ScoringConfig = scoringConfig,
): PartialFactor[] {
  const o = cfg.opportunity;
  const review = input.review;
  const reviewSource = review ? { source: review.source, capturedAt: review.capturedAt } : null;
  const rating = reputationValue(review?.rating ?? null, review?.reviewCount ?? null, cfg);
  const count = review?.reviewCount ?? null;
  const isVisual = o.visualCategories.includes(input.categoryRootSlug);

  return [
    {
      key: "rating",
      label: "Calificación en Google",
      weight: o.strengthWeights.rating,
      value: rating,
      detail:
        rating === null || !review
          ? "Sin dato"
          : `${review.rating?.toFixed(1).replace(".", ",")} ★ (ajustado por cantidad de reseñas)`,
      source: rating === null ? null : reviewSource,
    },
    {
      key: "reviewVolume",
      label: "Cantidad de reseñas",
      weight: o.strengthWeights.reviewVolume,
      value:
        count === null
          ? null
          : clamp01(
              Math.log10(Math.max(0, count) + 1) /
                Math.log10(cfg.googleReputation.reviewCountFull + 1),
            ),
      detail: count === null ? "Sin dato" : `${count} reseñas`,
      source: count === null ? null : reviewSource,
    },
    {
      key: "mainRoad",
      label: "Ubicación en vía principal",
      weight: o.strengthWeights.mainRoad,
      value: input.onMainRoad === null ? null : input.onMainRoad ? 1 : o.offMainRoadValue,
      detail:
        input.onMainRoad === null
          ? "Sin dato"
          : input.onMainRoad
            ? "Sí, en vía principal"
            : "No está en vía principal",
      source: null,
    },
    {
      key: "visualCategory",
      label: "Rubro que vende con imágenes",
      weight: o.strengthWeights.visualCategory,
      value: isVisual ? 1 : o.nonVisualCategoryValue,
      detail: isVisual ? "Sí (comida, bebidas, belleza u hospedaje)" : "Rubro menos visual",
      source: null,
    },
  ];
}

/**
 * Opportunity (0-100): the business does well (reviews, location, visual category)
 * but its social media is weak. No social media at all = maximum digital gap.
 */
export function computeOpportunity(
  input: ScoringInput,
  digitalHealth: number | null,
  cfg: ScoringConfig = scoringConfig,
): ScoreResult {
  const o = cfg.opportunity;
  // Strength always has at least the category factor, so require no minimum coverage here;
  // the coverage is kept in the result so the UI can flag partial data.
  const strength = combineFactors(businessStrengthFactors(input, cfg), 0);
  // Unknown strength factors count as neutral (50) rather than being ignored, so a business
  // with almost no data cannot outrank one with great reviews just because it is a café.
  const strengthScore =
    strength.score === null
      ? null
      : Math.round(strength.score * strength.coverage + 50 * (1 - strength.coverage));

  const noSocial = !hasAnySocial(input);
  const noInstagram = !input.instagram;
  const gap =
    noSocial || (noInstagram && digitalHealth === null)
      ? 100
      : digitalHealth === null
        ? null
        : 100 - digitalHealth;

  const gapFactor: Factor = {
    key: "digitalGap",
    label: "Brecha en redes",
    weight: o.gapWeight * 100,
    value: gap === null ? null : gap / 100,
    points: gap === null ? null : Math.round(gap * o.gapWeight * 10) / 10,
    detail:
      gap === null
        ? "Tiene redes pero aún no se han medido"
        : noSocial
          ? "No tiene redes registradas: brecha máxima"
          : noInstagram && digitalHealth === null
            ? "No tiene Instagram: brecha máxima"
            : `100 − Salud Digital (${digitalHealth}) = ${gap}`,
    source: null,
  };

  const strengthFactor: Factor = {
    key: "businessStrength",
    label: "Fortaleza del negocio",
    weight: o.strengthWeight * 100,
    value: strength.score === null ? null : strength.score / 100,
    points:
      strength.score === null ? null : Math.round(strength.score * o.strengthWeight * 10) / 10,
    detail:
      strength.score === null
        ? "Sin dato"
        : `${strength.score}/100 según ${strength.factors
            .filter((f) => f.value !== null)
            .map((f) => f.label.toLowerCase())
            .join(", ")}`,
    source: null,
  };

  const factors = [
    strengthFactor,
    gapFactor,
    ...strength.factors.map((f) => ({ ...f, key: `strength.${f.key}` })),
  ];

  if (gap === null || strengthScore === null) {
    return {
      score: null,
      coverage: strength.coverage,
      factors,
      note: "Datos insuficientes: falta medir sus redes",
    };
  }

  return {
    score: Math.round(strengthScore * o.strengthWeight + gap * o.gapWeight),
    coverage: strength.coverage,
    factors,
    note:
      strength.coverage < 0.5
        ? "Datos parciales: sin reseñas de Google, la fortaleza del negocio es estimada"
        : null,
  };
}
