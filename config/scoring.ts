/**
 * Scoring configuration. Change weights and thresholds here; bump `version`
 * so stored scores record which configuration produced them.
 *
 * Weights are relative: they are normalised over the factors that have data,
 * so they do not need to sum to 100 (tests check that they do, to keep the
 * breakdown easy to read).
 */
export const scoringConfig = {
  version: "2026-10-v1",

  digitalHealth: {
    weights: {
      postingFrequency: 20,
      recency: 15,
      engagement: 20,
      followersVsMedian: 15,
      reels: 10,
      profileCompleteness: 10,
      googleReputation: 10,
    },
    /** 12 posts in 30 days (≈3 per week) counts as full marks. */
    postsPer30dTarget: 12,
    /** Last post within this many days = full marks… */
    recencyFullDays: 7,
    /** …decreasing linearly to zero at this many days. */
    recencyZeroDays: 90,
    /** 3 % average engagement = full marks. */
    engagementRateTarget: 0.03,
    /** 4 reels in 30 days (≈1 per week) = full marks. */
    reelsPer30dTarget: 4,
    /** Below this share of the total weight with data, the score is "Datos insuficientes". */
    minWeightCoverage: 0.5,
  },

  /** Category follower medians need at least this many measured businesses. */
  medianMinSample: 3,

  googleReputation: {
    /** Bayesian smoothing: a few 5-star reviews should not beat many 4.6 ones. */
    priorRating: 4.0,
    priorWeight: 10,
    ratingFloor: 3.0,
    ratingCeiling: 4.8,
    /** Review count that counts as "a lot" for the opportunity score. */
    reviewCountFull: 200,
  },

  opportunity: {
    /** Opportunity = business strength × weight + digital gap × weight. */
    strengthWeight: 0.6,
    gapWeight: 0.4,
    strengthWeights: {
      rating: 45,
      reviewVolume: 25,
      mainRoad: 15,
      visualCategory: 15,
    },
    /** Root categories where photos/videos sell the most. */
    visualCategories: ["gastronomia", "bares", "belleza", "hospedaje"] as readonly string[],
    nonVisualCategoryValue: 0.5,
    offMainRoadValue: 0.4,
  },

  /** Digital Health below `red` is red, below `yellow` is yellow, otherwise green. */
  trafficLight: {
    red: 40,
    yellow: 70,
  },

  services: {
    /** Fewer reels/videos than this in 30 days suggests the Video service. */
    fewVideosThreshold: 2,
    promoTagSlugs: ["promociones", "eventos"] as readonly string[],
  },
} as const;

export type ScoringConfig = typeof scoringConfig;
