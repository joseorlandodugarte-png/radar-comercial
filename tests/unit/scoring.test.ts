import { describe, expect, it } from "vitest";

import { scoringConfig } from "@config/scoring";
import {
  computeDigitalHealth,
  computeOpportunity,
  computeTrafficLight,
  median,
  scoreBusiness,
  suggestServices,
  type ScoringInput,
  type SocialMetrics,
} from "@/lib/scoring";
import {
  followersVsMedianValue,
  recencyValue,
  reputationValue,
} from "@/lib/scoring/digital-health";

const NOW = new Date("2026-10-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const social = (overrides: Partial<SocialMetrics> = {}): SocialMetrics => ({
  platform: "instagram",
  source: "instagram_graph",
  capturedAt: daysAgo(1),
  followers: 1000,
  postsLast30d: 12,
  reelsLast30d: 4,
  lastPostAt: daysAgo(1),
  engagementRate: 0.03,
  usesReels: true,
  bioComplete: true,
  hasLinkInBio: true,
  mentionsPromotions: false,
  ...overrides,
});

const input = (overrides: Partial<ScoringInput> = {}): ScoringInput => ({
  categoryRootSlug: "gastronomia",
  servesFood: true,
  instagram: "negocio",
  facebook: null,
  tiktok: null,
  hasContact: true,
  onMainRoad: false,
  hasDigitalMenu: true,
  tagSlugs: [],
  social: social(),
  review: { source: "google_places", capturedAt: daysAgo(1), rating: 4.8, reviewCount: 500 },
  categoryFollowersMedian: 500,
  now: NOW,
  ...overrides,
});

describe("configuration", () => {
  it("digital health weights add up to 100", () => {
    const total = Object.values(scoringConfig.digitalHealth.weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("opportunity weights add up to 1 and strength weights to 100", () => {
    expect(
      scoringConfig.opportunity.strengthWeight + scoringConfig.opportunity.gapWeight,
    ).toBeCloseTo(1);
    const total = Object.values(scoringConfig.opportunity.strengthWeights).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBe(100);
  });

  it("traffic light thresholds are ordered", () => {
    expect(scoringConfig.trafficLight.red).toBeLessThan(scoringConfig.trafficLight.yellow);
  });
});

describe("digital health", () => {
  it("gives 100 to a profile that meets every target", () => {
    const r = computeDigitalHealth(input());
    expect(r.score).toBe(100);
    expect(r.coverage).toBe(1);
    expect(r.note).toBeNull();
  });

  it("gives 0 to an abandoned profile", () => {
    const r = computeDigitalHealth(
      input({
        social: social({
          followers: 0,
          postsLast30d: 0,
          reelsLast30d: 0,
          lastPostAt: daysAgo(400),
          engagementRate: 0,
          bioComplete: false,
          hasLinkInBio: false,
        }),
        hasContact: false,
        review: null,
      }),
    );
    expect(r.score).toBe(0);
  });

  it("returns null (Datos insuficientes) when there is no social measurement", () => {
    const r = computeDigitalHealth(input({ social: null }));
    expect(r.score).toBeNull();
    expect(r.note).toMatch(/insuficientes/);
    expect(r.factors.find((f) => f.key === "googleReputation")?.value).not.toBeNull();
  });

  it("returns null when everything is null", () => {
    const r = computeDigitalHealth(
      input({
        social: social({
          followers: null,
          postsLast30d: null,
          reelsLast30d: null,
          lastPostAt: null,
          engagementRate: null,
          usesReels: null,
          bioComplete: null,
          hasLinkInBio: null,
        }),
        review: null,
      }),
    );
    expect(r.score).toBeNull();
    expect(r.coverage).toBe(0);
    expect(r.factors.every((f) => f.detail === "Sin dato")).toBe(true);
  });

  it("redistributes weight of missing factors instead of treating them as zero", () => {
    const r = computeDigitalHealth(input({ review: null, categoryFollowersMedian: null }));
    expect(r.score).toBe(100);
    expect(r.coverage).toBeCloseTo(0.75);
    expect(r.note).toMatch(/repartió/);
  });

  it("breakdown points add up to the score", () => {
    const r = computeDigitalHealth(
      input({ social: social({ postsLast30d: 3, engagementRate: 0.01 }) }),
    );
    const sum = r.factors.reduce((s, f) => s + (f.points ?? 0), 0);
    expect(Math.round(sum)).toBe(r.score);
  });

  it("every known factor cites its source and date", () => {
    const r = computeDigitalHealth(input());
    for (const f of r.factors.filter((f) => f.key !== "profileCompleteness" || f.value !== null)) {
      expect(f.source?.capturedAt).toBeInstanceOf(Date);
    }
  });

  it("caps values above target at full marks", () => {
    const r = computeDigitalHealth(
      input({ social: social({ postsLast30d: 300, engagementRate: 0.9, reelsLast30d: 90 }) }),
    );
    expect(r.score).toBe(100);
  });

  it("ignores negative counts from bad imports", () => {
    const r = computeDigitalHealth(input({ social: social({ postsLast30d: -5 }) }));
    expect(r.factors.find((f) => f.key === "postingFrequency")?.value).toBe(0);
  });
});

describe("factor helpers", () => {
  it("recency: full marks up to 7 days, zero at 90, linear in between", () => {
    expect(recencyValue(daysAgo(0), NOW)).toBe(1);
    expect(recencyValue(daysAgo(7), NOW)).toBe(1);
    expect(recencyValue(daysAgo(90), NOW)).toBe(0);
    expect(recencyValue(daysAgo(365), NOW)).toBe(0);
    expect(recencyValue(daysAgo(48.5), NOW)).toBeCloseTo(0.5);
    expect(recencyValue(null, NOW)).toBeNull();
  });

  it("recency: a post dated in the future counts as today", () => {
    expect(recencyValue(new Date(NOW.getTime() + 5 * 86_400_000), NOW)).toBe(1);
  });

  it("followers vs median: median = 0.5, double = 1, half = 0", () => {
    expect(followersVsMedianValue(500, 500)).toBe(0.5);
    expect(followersVsMedianValue(1000, 500)).toBe(1);
    expect(followersVsMedianValue(250, 500)).toBe(0);
    expect(followersVsMedianValue(0, 500)).toBe(0);
    expect(followersVsMedianValue(100, 0)).toBe(1);
    expect(followersVsMedianValue(0, 0)).toBe(0);
    expect(followersVsMedianValue(100, null)).toBeNull();
    expect(followersVsMedianValue(null, 100)).toBeNull();
  });

  it("reputation: rating without reviews is Sin dato", () => {
    expect(reputationValue(5, 0)).toBeNull();
    expect(reputationValue(null, 10)).toBeNull();
    expect(reputationValue(4.5, null)).toBeNull();
  });

  it("reputation: few perfect reviews do not beat many very good ones", () => {
    expect(reputationValue(5, 2)!).toBeLessThan(reputationValue(4.7, 300)!);
  });

  it("median handles empty, odd and even samples", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("traffic light", () => {
  it("no social handles at all is 'no_social'", () => {
    expect(computeTrafficLight({ instagram: null, facebook: null, tiktok: null }, 90)).toBe(
      "no_social",
    );
  });
  it("social but unmeasured is 'unknown'", () => {
    expect(computeTrafficLight({ instagram: "x", facebook: null, tiktok: null }, null)).toBe(
      "unknown",
    );
  });
  it("uses exact thresholds: 39 red, 40 yellow, 69 yellow, 70 green", () => {
    const h = { instagram: "x", facebook: null, tiktok: null };
    expect(computeTrafficLight(h, 0)).toBe("red");
    expect(computeTrafficLight(h, 39)).toBe("red");
    expect(computeTrafficLight(h, 40)).toBe("yellow");
    expect(computeTrafficLight(h, 69)).toBe("yellow");
    expect(computeTrafficLight(h, 70)).toBe("green");
    expect(computeTrafficLight(h, 100)).toBe("green");
  });
});

describe("opportunity", () => {
  it("is high for a strong business with poor social media", () => {
    const r = computeOpportunity(input({ onMainRoad: true }), 10);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("is low for a weak business with great social media", () => {
    const r = computeOpportunity(
      input({
        categoryRootSlug: "servicios",
        review: { source: "google_places", capturedAt: NOW, rating: 3, reviewCount: 3 },
      }),
      100,
    );
    expect(r.score).toBeLessThan(25);
  });

  it("no social media at all means maximum digital gap", () => {
    const r = computeOpportunity(input({ instagram: null, social: null }), null);
    expect(r.factors.find((f) => f.key === "digitalGap")?.value).toBe(1);
    expect(r.score).not.toBeNull();
  });

  it("has social but unmeasured → Datos insuficientes", () => {
    const r = computeOpportunity(input({ social: null }), null);
    expect(r.score).toBeNull();
  });

  it("without Google reviews it still computes but flags partial data", () => {
    const r = computeOpportunity(input({ review: null, onMainRoad: null }), 20);
    expect(r.score).not.toBeNull();
    expect(r.note).toMatch(/parciales/);
  });

  it("stays within 0-100", () => {
    for (const dh of [0, 50, 100]) {
      const r = computeOpportunity(input(), dh);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("suggested services", () => {
  const services = (i: Partial<ScoringInput>) => suggestServices(input(i)).map((s) => s.service);

  it("no Instagram → social setup with maximum priority, listed first", () => {
    const r = suggestServices(input({ instagram: null, social: null }));
    expect(r[0]).toMatchObject({
      service: "social_setup",
      priority: "max",
      ruleId: "no_instagram",
    });
    expect(r.map((s) => s.service)).toContain("video");
  });

  it("few videos → Video; exactly at the threshold → no Video", () => {
    expect(services({ social: social({ reelsLast30d: 1 }) })).toContain("video");
    expect(services({ social: social({ reelsLast30d: 2 }) })).not.toContain("video");
  });

  it("restaurant without digital menu → Menu (high); unknown → Menu (low, verify)", () => {
    expect(
      suggestServices(input({ hasDigitalMenu: false })).find((s) => s.service === "menu")?.priority,
    ).toBe("high");
    expect(
      suggestServices(input({ hasDigitalMenu: null })).find((s) => s.service === "menu")?.priority,
    ).toBe("low");
    expect(services({ hasDigitalMenu: true })).not.toContain("menu");
    expect(services({ servesFood: false, hasDigitalMenu: false })).not.toContain("menu");
  });

  it("main road → Billboard; unknown road → nothing", () => {
    expect(services({ onMainRoad: true })).toContain("billboard");
    expect(services({ onMainRoad: null })).not.toContain("billboard");
  });

  it("promotions or events → Flyers", () => {
    expect(services({ tagSlugs: ["eventos"] })).toContain("flyer");
    expect(services({ social: social({ mentionsPromotions: true }) })).toContain("flyer");
    expect(services({})).not.toContain("flyer");
  });

  it("every suggestion explains itself", () => {
    const r = suggestServices(
      input({
        instagram: null,
        social: null,
        hasDigitalMenu: false,
        onMainRoad: true,
        tagSlugs: ["promociones"],
      }),
    );
    expect(r).toHaveLength(5);
    for (const s of r) {
      expect(s.reason.length).toBeGreaterThan(10);
      expect(s.ruleId).toBeTruthy();
    }
  });
});

describe("scoreBusiness", () => {
  it("returns all parts with the config version", () => {
    const r = scoreBusiness(
      input({
        social: social({
          postsLast30d: 0,
          reelsLast30d: 0,
          lastPostAt: daysAgo(120),
          engagementRate: 0.001,
        }),
      }),
    );
    expect(r.trafficLight).toBe("red");
    expect(r.configVersion).toBe(scoringConfig.version);
    expect(r.services.map((s) => s.service)).toContain("video");
  });
});
