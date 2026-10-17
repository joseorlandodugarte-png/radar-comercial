import { desc, eq, inArray, sql } from "drizzle-orm";

import type { Db } from "@/db/client";
import {
  businessTags,
  businesses,
  categories,
  reviewSnapshots,
  scores,
  serviceNeeds,
  socialSnapshots,
  tags,
  type Category,
} from "@/db/schema";
import { median, scoreBusiness, type ReviewMetrics, type SocialMetrics } from "@/lib/scoring";
import { scoringConfig } from "@config/scoring";

export function categoryRootResolver(
  all: Pick<Category, "id" | "parentId" | "slug" | "servesFood">[],
) {
  const byId = new Map(all.map((c) => [c.id, c]));
  return (id: number) => {
    let current = byId.get(id);
    let servesFood = current?.servesFood ?? false;
    for (let guard = 0; current?.parentId != null && guard < 10; guard++) {
      current = byId.get(current.parentId);
      servesFood ||= current?.servesFood ?? false;
    }
    return { rootSlug: current?.slug ?? "otros", servesFood };
  };
}

/** Latest snapshot per business: Instagram first, then any other platform. */
export async function latestSocialByBusiness(db: Db) {
  const rows = await db
    .selectDistinctOn([socialSnapshots.businessId])
    .from(socialSnapshots)
    .orderBy(
      socialSnapshots.businessId,
      desc(sql`${socialSnapshots.platform} = 'instagram'`),
      desc(socialSnapshots.capturedAt),
    );
  return new Map(rows.map((r) => [r.businessId, r]));
}

export async function latestReviewByBusiness(db: Db) {
  const rows = await db
    .selectDistinctOn([reviewSnapshots.businessId])
    .from(reviewSnapshots)
    .orderBy(reviewSnapshots.businessId, desc(reviewSnapshots.capturedAt));
  return new Map(rows.map((r) => [r.businessId, r]));
}

/**
 * Recomputes scores and suggested services from the latest snapshots.
 * Pass `businessIds` to limit the write to some businesses (medians always use everything).
 */
export async function recomputeScores(db: Db, businessIds?: number[], now = new Date()) {
  const [allCategories, allBusinesses, social, reviews, tagRows] = await Promise.all([
    db.select().from(categories),
    db.select().from(businesses),
    latestSocialByBusiness(db),
    latestReviewByBusiness(db),
    db
      .select({ businessId: businessTags.businessId, slug: tags.slug })
      .from(businessTags)
      .innerJoin(tags, eq(tags.id, businessTags.tagId)),
  ]);

  const rootOf = categoryRootResolver(allCategories);
  const tagsByBusiness = new Map<number, string[]>();
  for (const t of tagRows)
    tagsByBusiness.set(t.businessId, [...(tagsByBusiness.get(t.businessId) ?? []), t.slug]);

  // Follower medians per state + root category, from Instagram measurements only.
  const followerGroups = new Map<string, number[]>();
  for (const b of allBusinesses) {
    const snap = social.get(b.id);
    if (snap?.platform !== "instagram" || snap.followers === null) continue;
    const key = `${b.stateId}:${rootOf(b.categoryId).rootSlug}`;
    followerGroups.set(key, [...(followerGroups.get(key) ?? []), snap.followers]);
  }
  const medianFor = (key: string) => {
    const values = followerGroups.get(key) ?? [];
    return values.length >= scoringConfig.medianMinSample ? median(values) : null;
  };

  const targets = businessIds
    ? allBusinesses.filter((b) => businessIds.includes(b.id))
    : allBusinesses;
  if (targets.length === 0) return 0;

  const scoreRows: (typeof scores.$inferInsert)[] = [];
  const needRows: (typeof serviceNeeds.$inferInsert)[] = [];

  for (const b of targets) {
    const { rootSlug, servesFood } = rootOf(b.categoryId);
    const snap = social.get(b.id);
    const rev = reviews.get(b.id);
    const socialMetrics: SocialMetrics | null = snap
      ? {
          platform: snap.platform,
          source: snap.source,
          capturedAt: snap.capturedAt,
          followers: snap.followers,
          postsLast30d: snap.postsLast30d,
          reelsLast30d: snap.reelsLast30d,
          lastPostAt: snap.lastPostAt,
          engagementRate: snap.engagementRate,
          usesReels: snap.usesReels,
          bioComplete: snap.bioComplete,
          hasLinkInBio: snap.hasLinkInBio,
          mentionsPromotions: snap.mentionsPromotions,
        }
      : null;
    const reviewMetrics: ReviewMetrics | null = rev
      ? {
          source: rev.source,
          capturedAt: rev.capturedAt,
          rating: rev.rating,
          reviewCount: rev.reviewCount,
        }
      : null;

    const result = scoreBusiness({
      categoryRootSlug: rootSlug,
      servesFood,
      instagram: b.instagram,
      facebook: b.facebook,
      tiktok: b.tiktok,
      hasContact: Boolean(b.phone || b.whatsapp),
      onMainRoad: b.onMainRoad,
      hasDigitalMenu: b.hasDigitalMenu,
      tagSlugs: tagsByBusiness.get(b.id) ?? [],
      social: socialMetrics,
      review: reviewMetrics,
      categoryFollowersMedian: medianFor(`${b.stateId}:${rootSlug}`),
      now,
    });

    scoreRows.push({
      businessId: b.id,
      digitalHealth: result.digitalHealth.score,
      opportunity: result.opportunity.score,
      trafficLight: result.trafficLight,
      breakdown: { digitalHealth: result.digitalHealth, opportunity: result.opportunity },
      configVersion: result.configVersion,
      computedAt: now,
    });
    for (const s of result.services) {
      needRows.push({ businessId: b.id, ...s, computedAt: now });
    }
  }

  const ids = targets.map((b) => b.id);
  await db.transaction(async (tx) => {
    for (let i = 0; i < scoreRows.length; i += 500) {
      await tx
        .insert(scores)
        .values(scoreRows.slice(i, i + 500))
        .onConflictDoUpdate({
          target: scores.businessId,
          set: {
            digitalHealth: sql`excluded.digital_health`,
            opportunity: sql`excluded.opportunity`,
            trafficLight: sql`excluded.traffic_light`,
            breakdown: sql`excluded.breakdown`,
            configVersion: sql`excluded.config_version`,
            computedAt: sql`excluded.computed_at`,
          },
        });
    }
    await tx.delete(serviceNeeds).where(inArray(serviceNeeds.businessId, ids));
    for (let i = 0; i < needRows.length; i += 500) {
      await tx.insert(serviceNeeds).values(needRows.slice(i, i + 500));
    }
  });

  return targets.length;
}
