import type { DataSource, Priority, Service, TrafficLight } from "@/db/schema";

export type MetricSource = { source: DataSource; capturedAt: Date };

/** Latest social measurement for a business (any platform, Instagram preferred). */
export type SocialMetrics = MetricSource & {
  platform: "instagram" | "facebook" | "tiktok";
  followers: number | null;
  postsLast30d: number | null;
  reelsLast30d: number | null;
  lastPostAt: Date | null;
  engagementRate: number | null;
  usesReels: boolean | null;
  bioComplete: boolean | null;
  hasLinkInBio: boolean | null;
  mentionsPromotions: boolean | null;
};

export type ReviewMetrics = MetricSource & {
  rating: number | null;
  reviewCount: number | null;
};

/** Everything the scoring functions need, decoupled from the database. */
export type ScoringInput = {
  categoryRootSlug: string;
  servesFood: boolean;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  hasContact: boolean;
  onMainRoad: boolean | null;
  hasDigitalMenu: boolean | null;
  tagSlugs: string[];
  social: SocialMetrics | null;
  review: ReviewMetrics | null;
  /** Median followers of measured businesses in the same root category (and state). */
  categoryFollowersMedian: number | null;
  now: Date;
};

export type Factor = {
  key: string;
  label: string;
  weight: number;
  /** Normalised 0-1, or null when there is no data ("Sin dato"). */
  value: number | null;
  /** Points this factor adds to the final 0-100 score, after re-weighting. */
  points: number | null;
  /** Human explanation of the raw data, in Spanish. */
  detail: string;
  source: MetricSource | null;
};

export type ScoreResult = {
  /** 0-100, or null when there is not enough data. */
  score: number | null;
  /** Share (0-1) of the total weight that had data. */
  coverage: number;
  factors: Factor[];
  note: string | null;
};

export type ServiceSuggestion = {
  service: Service;
  priority: Priority;
  ruleId: string;
  reason: string;
};

export type BusinessScore = {
  digitalHealth: ScoreResult;
  opportunity: ScoreResult;
  trafficLight: TrafficLight;
  services: ServiceSuggestion[];
  configVersion: string;
};
