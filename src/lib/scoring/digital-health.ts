import { scoringConfig, type ScoringConfig } from "@config/scoring";

import { clamp01, combineFactors, daysBetween } from "./math";
import type { Factor, ScoreResult, ScoringInput } from "./types";

type PartialFactor = Omit<Factor, "points">;

const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

/** Google reputation smoothed by review volume, normalised 0-1. Null without reviews. */
export function reputationValue(
  rating: number | null,
  reviewCount: number | null,
  cfg: ScoringConfig = scoringConfig,
): number | null {
  if (rating === null || reviewCount === null || reviewCount <= 0) return null;
  const { priorRating, priorWeight, ratingFloor, ratingCeiling } = cfg.googleReputation;
  const smoothed = (rating * reviewCount + priorRating * priorWeight) / (reviewCount + priorWeight);
  return clamp01((smoothed - ratingFloor) / (ratingCeiling - ratingFloor));
}

/** Followers relative to the category median on a log scale: median = 0.5, double = 1, half = 0. */
export function followersVsMedianValue(
  followers: number | null,
  median: number | null,
): number | null {
  if (followers === null || median === null) return null;
  if (median <= 0) return followers > 0 ? 1 : 0;
  if (followers <= 0) return 0;
  return clamp01(0.5 + 0.5 * Math.log2(followers / median));
}

export function recencyValue(
  lastPostAt: Date | null,
  now: Date,
  cfg: ScoringConfig = scoringConfig,
): number | null {
  if (lastPostAt === null) return null;
  const { recencyFullDays, recencyZeroDays } = cfg.digitalHealth;
  // A date in the future (clock skew, bad import) counts as "today".
  const days = Math.max(0, daysBetween(lastPostAt, now));
  if (days <= recencyFullDays) return 1;
  if (days >= recencyZeroDays) return 0;
  return 1 - (days - recencyFullDays) / (recencyZeroDays - recencyFullDays);
}

export function computeDigitalHealth(
  input: ScoringInput,
  cfg: ScoringConfig = scoringConfig,
): ScoreResult {
  const w = cfg.digitalHealth.weights;
  const dh = cfg.digitalHealth;
  const s = input.social;
  const socialSource = s ? { source: s.source, capturedAt: s.capturedAt } : null;
  const review = input.review;
  const reviewSource = review ? { source: review.source, capturedAt: review.capturedAt } : null;

  const factors: PartialFactor[] = [];

  const posts = s?.postsLast30d ?? null;
  factors.push({
    key: "postingFrequency",
    label: "Frecuencia de publicaciones",
    weight: w.postingFrequency,
    value: posts === null ? null : clamp01(Math.max(0, posts) / dh.postsPer30dTarget),
    detail:
      posts === null
        ? "Sin dato"
        : `${posts} publicaciones en 30 días (meta: ${dh.postsPer30dTarget})`,
    source: posts === null ? null : socialSource,
  });

  const lastPostAt = s?.lastPostAt ?? null;
  const recency = recencyValue(lastPostAt, input.now, cfg);
  factors.push({
    key: "recency",
    label: "Última publicación",
    weight: w.recency,
    value: recency,
    detail:
      lastPostAt === null
        ? "Sin dato"
        : `Hace ${Math.max(0, Math.round(daysBetween(lastPostAt, input.now)))} días`,
    source: recency === null ? null : socialSource,
  });

  const er = s?.engagementRate ?? null;
  factors.push({
    key: "engagement",
    label: "Interacción (engagement)",
    weight: w.engagement,
    value: er === null ? null : clamp01(Math.max(0, er) / dh.engagementRateTarget),
    detail: er === null ? "Sin dato" : `${pct(er)} (referencia: ${pct(dh.engagementRateTarget)})`,
    source: er === null ? null : socialSource,
  });

  const followers = s?.followers ?? null;
  const fvm = followersVsMedianValue(followers, input.categoryFollowersMedian);
  factors.push({
    key: "followersVsMedian",
    label: "Seguidores frente a su categoría",
    weight: w.followersVsMedian,
    value: fvm,
    detail:
      followers === null
        ? "Sin dato"
        : input.categoryFollowersMedian === null
          ? `${followers.toLocaleString("es-VE")} seguidores; aún no hay suficientes negocios medidos en su categoría para comparar`
          : `${followers.toLocaleString("es-VE")} seguidores; la mediana de su categoría es ${Math.round(input.categoryFollowersMedian).toLocaleString("es-VE")}`,
    source: fvm === null ? null : socialSource,
  });

  const reels = s?.reelsLast30d ?? null;
  const usesReels = s?.usesReels ?? null;
  const reelsValue =
    reels !== null
      ? clamp01(Math.max(0, reels) / dh.reelsPer30dTarget)
      : usesReels === null
        ? null
        : usesReels
          ? 0.5
          : 0;
  factors.push({
    key: "reels",
    label: "Uso de reels y videos",
    weight: w.reels,
    value: reelsValue,
    detail:
      reels !== null
        ? `${reels} reels en 30 días (meta: ${dh.reelsPer30dTarget})`
        : usesReels === null
          ? "Sin dato"
          : usesReels
            ? "Usa reels (sin conteo del último mes)"
            : "No usa reels",
    source: reelsValue === null ? null : socialSource,
  });

  const profileChecks: Array<[string, boolean | null]> = [
    ["bio completa", s?.bioComplete ?? null],
    ["link en la bio", s?.hasLinkInBio ?? null],
  ];
  const knownChecks = profileChecks.filter((c): c is [string, boolean] => c[1] !== null);
  // Without any profile measurement we cannot judge the profile; contact data alone is not enough.
  const profileValue =
    knownChecks.length === 0
      ? null
      : (knownChecks.filter((c) => c[1]).length + (input.hasContact ? 1 : 0)) /
        (knownChecks.length + 1);
  factors.push({
    key: "profileCompleteness",
    label: "Perfil completo",
    weight: w.profileCompleteness,
    value: profileValue,
    detail:
      profileValue === null
        ? "Sin dato"
        : [
            ...knownChecks.map(([label, ok]) => `${ok ? "✓" : "✗"} ${label}`),
            `${input.hasContact ? "✓" : "✗"} teléfono o WhatsApp`,
          ].join(" · "),
    source: profileValue === null ? null : socialSource,
  });

  const rep = reputationValue(review?.rating ?? null, review?.reviewCount ?? null, cfg);
  factors.push({
    key: "googleReputation",
    label: "Reputación en Google",
    weight: w.googleReputation,
    value: rep,
    detail:
      rep === null || !review
        ? "Sin dato"
        : `${review.rating?.toFixed(1).replace(".", ",")} ★ con ${review.reviewCount} reseñas`,
    source: rep === null ? null : reviewSource,
  });

  return combineFactors(factors, dh.minWeightCoverage);
}
