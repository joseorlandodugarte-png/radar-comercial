import "server-only";

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db/client";
import {
  businessTags,
  businesses,
  categories,
  interactions,
  leads,
  manualReviewQueue,
  municipalities,
  reviewSnapshots,
  scores,
  serviceNeeds,
  socialSnapshots,
  states,
  tags,
  type LeadStage,
  type Service,
  type TrafficLight,
} from "@/db/schema";
import type { SORTS, STAGE_FILTERS } from "@/lib/filters";
import { slugify } from "@/lib/format/slug";
import type { ScoreResult } from "@/lib/scoring";

/** Fully qualified id column; drizzle drops the table name in single-table selects. */
const ref = (table: string) => sql.raw(`"${table}"."id"`);

// ---------------------------------------------------------------------------
// Geography & categories (small, cached per request)
// ---------------------------------------------------------------------------

export const getStates = cache(async () => {
  const counts = db
    .select({ stateId: businesses.stateId, n: sql<number>`count(*)::int`.as("n") })
    .from(businesses)
    .groupBy(businesses.stateId)
    .as("counts");
  return db
    .select({
      id: states.id,
      name: states.name,
      slug: states.slug,
      capital: states.capital,
      businessCount: sql<number>`coalesce(${counts.n}, 0)`,
      municipalityCount: sql<number>`(select count(*)::int from municipalities m where m.state_id = ${ref("states")})`,
    })
    .from(states)
    .leftJoin(counts, eq(counts.stateId, states.id))
    .orderBy(asc(states.name));
});

export const getStateBySlug = cache(async (slug: string) => {
  const [row] = await db.select().from(states).where(eq(states.slug, slug));
  return row ?? null;
});

export const getMunicipalities = cache(async (stateId: number) => {
  return db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      slug: municipalities.slug,
      seat: municipalities.seat,
      center: municipalities.center,
      businessCount: sql<number>`(select count(*)::int from businesses b where b.municipality_id = ${ref("municipalities")})`,
      redCount: sql<number>`(select count(*)::int from businesses b join scores s on s.business_id = b.id
        where b.municipality_id = ${ref("municipalities")} and s.traffic_light in ('red', 'no_social'))`,
    })
    .from(municipalities)
    .where(eq(municipalities.stateId, stateId))
    .orderBy(asc(municipalities.name));
});

export const getMunicipalityBySlug = cache(async (stateId: number, slug: string) => {
  const [row] = await db
    .select()
    .from(municipalities)
    .where(and(eq(municipalities.stateId, stateId), eq(municipalities.slug, slug)));
  return row ?? null;
});

export async function getSectors(municipalityId: number) {
  return db
    .select({ sector: businesses.sector, n: sql<number>`count(*)::int` })
    .from(businesses)
    .where(
      and(eq(businesses.municipalityId, municipalityId), sql`${businesses.sector} is not null`),
    )
    .groupBy(businesses.sector)
    .orderBy(desc(sql`count(*)`), asc(businesses.sector));
}

export const getCategories = cache(async () => {
  const all = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const roots = all.filter((c) => c.parentId === null);
  const byId = new Map(all.map((c) => [c.id, c]));
  const rootOf = (id: number) => {
    let c = byId.get(id);
    for (let i = 0; c?.parentId != null && i < 10; i++) c = byId.get(c.parentId);
    return c ?? null;
  };
  const descendants = (slug: string) => {
    const start = all.find((c) => c.slug === slug);
    if (!start) return [];
    const ids = [start.id];
    for (let i = 0; i < ids.length; i++)
      for (const c of all) if (c.parentId === ids[i]) ids.push(c.id);
    return ids;
  };
  return {
    all,
    roots: roots.map((r) => ({ ...r, children: all.filter((c) => c.parentId === r.id) })),
    rootOf,
    descendants,
  };
});

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export type BusinessFilters = {
  stateId?: number | null;
  municipalityId?: number | null;
  sector?: string | null;
  cat?: string | null;
  luz?: TrafficLight[];
  servicio?: Service | null;
  etapa?: (typeof STAGE_FILTERS)[number] | null;
  ig?: "con" | "sin" | null;
  q?: string | null;
  orden?: (typeof SORTS)[number];
  limit?: number;
  offset?: number;
};

const PRIORITY_ORDER = sql`case priority when 'max' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

function whereFor(f: BusinessFilters, catIds: number[] | null): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.stateId) conds.push(eq(businesses.stateId, f.stateId));
  if (f.municipalityId) conds.push(eq(businesses.municipalityId, f.municipalityId));
  if (f.sector) conds.push(eq(businesses.sector, f.sector));
  if (catIds) conds.push(catIds.length ? inArray(businesses.categoryId, catIds) : sql`false`);
  if (f.luz?.length) conds.push(inArray(scores.trafficLight, f.luz));
  if (f.servicio)
    conds.push(
      sql`exists (select 1 from service_needs n where n.business_id = ${ref("businesses")} and n.service = ${f.servicio})`,
    );
  if (f.etapa === "sin") conds.push(isNull(leads.id));
  else if (f.etapa) conds.push(eq(leads.stage, f.etapa));
  if (f.ig === "con") conds.push(sql`${businesses.instagram} is not null`);
  if (f.ig === "sin") conds.push(isNull(businesses.instagram));
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/^@/, "")}%`;
    conds.push(
      or(
        ilike(businesses.name, term),
        ilike(businesses.instagram, term),
        ilike(businesses.sector, term),
      ),
    );
  }
  return and(...conds);
}

const listColumns = {
  id: businesses.id,
  name: businesses.name,
  source: businesses.source,
  sector: businesses.sector,
  address: businesses.address,
  phone: businesses.phone,
  whatsapp: businesses.whatsapp,
  instagram: businesses.instagram,
  facebook: businesses.facebook,
  tiktok: businesses.tiktok,
  website: businesses.website,
  onMainRoad: businesses.onMainRoad,
  hasDigitalMenu: businesses.hasDigitalMenu,
  googlePlaceId: businesses.googlePlaceId,
  lat: sql<number | null>`ST_Y(${businesses.location})`,
  lng: sql<number | null>`ST_X(${businesses.location})`,
  categoryId: businesses.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categorySlug: categories.slug,
  stateName: states.name,
  stateSlug: states.slug,
  municipalityName: municipalities.name,
  municipalitySlug: municipalities.slug,
  digitalHealth: scores.digitalHealth,
  opportunity: scores.opportunity,
  trafficLight: sql<TrafficLight>`coalesce(${scores.trafficLight}, 'unknown')`,
  stage: leads.stage,
  nextActionAt: leads.nextActionAt,
  topService: sql<Service | null>`(select n.service from service_needs n where n.business_id = ${ref("businesses")} order by ${PRIORITY_ORDER} limit 1)`,
  topServiceReason: sql<
    string | null
  >`(select n.reason from service_needs n where n.business_id = ${ref("businesses")} order by ${PRIORITY_ORDER} limit 1)`,
  followers: sql<
    number | null
  >`(select s.followers from social_snapshots s where s.business_id = ${ref("businesses")} order by (s.platform = 'instagram') desc, s.captured_at desc limit 1)`,
  rating: sql<
    number | null
  >`(select r.rating from review_snapshots r where r.business_id = ${ref("businesses")} order by r.captured_at desc limit 1)`,
  reviewCount: sql<
    number | null
  >`(select r.review_count from review_snapshots r where r.business_id = ${ref("businesses")} order by r.captured_at desc limit 1)`,
};

export type BusinessListItem = Awaited<ReturnType<typeof listBusinesses>>["items"][number];

export async function listBusinesses(f: BusinessFilters) {
  const cats = f.cat ? (await getCategories()).descendants(f.cat) : null;
  const where = whereFor(f, cats);

  const order =
    f.orden === "nombre"
      ? [asc(businesses.name)]
      : f.orden === "salud"
        ? [sql`${scores.digitalHealth} asc nulls first`, asc(businesses.name)]
        : f.orden === "seguidores"
          ? [sql`${listColumns.followers} desc nulls last`, asc(businesses.name)]
          : [sql`${scores.opportunity} desc nulls last`, asc(businesses.name)];

  const base = db
    .select(listColumns)
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .innerJoin(states, eq(states.id, businesses.stateId))
    .leftJoin(municipalities, eq(municipalities.id, businesses.municipalityId))
    .leftJoin(scores, eq(scores.businessId, businesses.id))
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .where(where)
    .orderBy(...order);

  const [items, total] = await Promise.all([
    f.limit ? base.limit(f.limit).offset(f.offset ?? 0) : base,
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(businesses)
      .leftJoin(scores, eq(scores.businessId, businesses.id))
      .leftJoin(leads, eq(leads.businessId, businesses.id))
      .where(where),
  ]);
  const { rootOf } = await getCategories();
  return {
    items: items.map((i) => ({ ...i, rootSlug: rootOf(i.categoryId)?.slug ?? null })),
    total: total[0]?.n ?? 0,
  };
}

export type StoredBreakdown = {
  digitalHealth: ScoreResult;
  opportunity: ScoreResult;
};

export async function getBusinessDetail(id: number) {
  const items = await db
    .select(listColumns)
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .innerJoin(states, eq(states.id, businesses.stateId))
    .leftJoin(municipalities, eq(municipalities.id, businesses.municipalityId))
    .leftJoin(scores, eq(scores.businessId, businesses.id))
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .where(eq(businesses.id, id));
  const base = items[0];
  if (!base) return null;

  const [business, score, needs, lead, social, reviews, tagRows, pendingReview] = await Promise.all(
    [
      db.query.businesses.findFirst({ where: eq(businesses.id, id) }),
      db.query.scores.findFirst({ where: eq(scores.businessId, id) }),
      db.select().from(serviceNeeds).where(eq(serviceNeeds.businessId, id)).orderBy(PRIORITY_ORDER),
      db.query.leads.findFirst({
        where: eq(leads.businessId, id),
        with: { interactions: { orderBy: [desc(interactions.occurredAt)] } },
      }),
      db
        .select()
        .from(socialSnapshots)
        .where(eq(socialSnapshots.businessId, id))
        .orderBy(asc(socialSnapshots.capturedAt)),
      db
        .select()
        .from(reviewSnapshots)
        .where(eq(reviewSnapshots.businessId, id))
        .orderBy(asc(reviewSnapshots.capturedAt)),
      db
        .select({ slug: tags.slug, name: tags.name, color: tags.color })
        .from(businessTags)
        .innerJoin(tags, eq(tags.id, businessTags.tagId))
        .where(eq(businessTags.businessId, id)),
      db
        .select()
        .from(manualReviewQueue)
        .where(and(eq(manualReviewQueue.businessId, id), eq(manualReviewQueue.status, "pending"))),
    ],
  );
  if (!business) return null;
  const { rootOf } = await getCategories();

  return {
    ...base,
    rootSlug: rootOf(base.categoryId)?.slug ?? null,
    notes: business.notes,
    createdAt: business.createdAt,
    osmId: business.osmId,
    breakdown: (score?.breakdown ?? null) as StoredBreakdown | null,
    scoreComputedAt: score?.computedAt ?? null,
    scoreConfigVersion: score?.configVersion ?? null,
    services: needs,
    lead: lead ?? null,
    socialHistory: social,
    reviewHistory: reviews,
    tags: tagRows,
    pendingReview,
  };
}

export type BusinessDetail = NonNullable<Awaited<ReturnType<typeof getBusinessDetail>>>;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(stateId: number, municipalityId: number | null) {
  const { items } = await listBusinesses({ stateId, municipalityId, orden: "oportunidad" });
  const { roots } = await getCategories();

  const byLight: Record<TrafficLight, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    no_social: 0,
    unknown: 0,
  };
  const byRoot = new Map<
    string,
    { name: string; icon: string; total: number; red: number; noSocial: number }
  >();
  for (const r of roots)
    byRoot.set(r.slug, { name: r.name, icon: r.icon, total: 0, red: 0, noSocial: 0 });
  for (const b of items) {
    byLight[b.trafficLight] += 1;
    const g = b.rootSlug ? byRoot.get(b.rootSlug) : undefined;
    if (g) {
      g.total += 1;
      if (b.trafficLight === "red") g.red += 1;
      if (b.trafficLight === "no_social") g.noSocial += 1;
    }
  }

  const activeLeads = items.filter((b) => b.stage && !["won", "lost"].includes(b.stage)).length;
  const top = items
    .filter((b) => b.opportunity !== null && b.stage !== "won" && b.stage !== "lost")
    .slice(0, 20);

  return {
    total: items.length,
    byLight,
    byCategory: [...byRoot.entries()]
      .map(([slug, v]) => ({ slug, ...v }))
      .filter((c) => c.total > 0),
    activeLeads,
    needHelp: byLight.red + byLight.no_social,
    top,
  };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function getPipeline(stateId?: number | null) {
  const rows = await db
    .select({
      leadId: leads.id,
      stage: leads.stage,
      nextActionAt: leads.nextActionAt,
      nextActionNote: leads.nextActionNote,
      stageChangedAt: leads.stageChangedAt,
      businessId: businesses.id,
      name: businesses.name,
      source: businesses.source,
      whatsapp: businesses.whatsapp,
      phone: businesses.phone,
      municipalityName: municipalities.name,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      opportunity: scores.opportunity,
      trafficLight: sql<TrafficLight>`coalesce(${scores.trafficLight}, 'unknown')`,
      topService: listColumns.topService,
      lastInteractionAt: sql<Date | null>`(select max(i.occurred_at) from interactions i where i.lead_id = ${ref("leads")})`,
    })
    .from(leads)
    .innerJoin(businesses, eq(businesses.id, leads.businessId))
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .leftJoin(municipalities, eq(municipalities.id, businesses.municipalityId))
    .leftJoin(scores, eq(scores.businessId, businesses.id))
    .where(stateId ? eq(businesses.stateId, stateId) : undefined)
    .orderBy(sql`${leads.nextActionAt} asc nulls last`, desc(leads.stageChangedAt));
  return rows;
}

export type PipelineItem = Awaited<ReturnType<typeof getPipeline>>[number];

export type { LeadStage };

// ---------------------------------------------------------------------------
// Search & review queue
// ---------------------------------------------------------------------------

export async function globalSearch(q: string) {
  const term = q.trim();
  if (term.length < 2) return { businesses: [], municipalities: [] };
  const [biz, munis] = await Promise.all([
    listBusinesses({ q: term, limit: 30, orden: "oportunidad" }),
    db
      .select({
        name: municipalities.name,
        slug: municipalities.slug,
        stateSlug: states.slug,
        stateName: states.name,
      })
      .from(municipalities)
      .innerJoin(states, eq(states.id, municipalities.stateId))
      .where(
        or(
          ilike(municipalities.name, `%${term}%`),
          ilike(municipalities.slug, `%${slugify(term)}%`),
        ),
      )
      .limit(5),
  ]);
  return { businesses: biz.items, municipalities: munis };
}

export async function getReviewQueue() {
  return db
    .select({
      id: manualReviewQueue.id,
      reason: manualReviewQueue.reason,
      source: manualReviewQueue.source,
      createdAt: manualReviewQueue.createdAt,
      businessId: businesses.id,
      name: businesses.name,
      instagram: businesses.instagram,
    })
    .from(manualReviewQueue)
    .innerJoin(businesses, eq(businesses.id, manualReviewQueue.businessId))
    .where(eq(manualReviewQueue.status, "pending"))
    .orderBy(desc(manualReviewQueue.createdAt));
}
