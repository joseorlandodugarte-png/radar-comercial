import { eq, sql } from "drizzle-orm";

import { db, pgClient } from "@/db/client";
import {
  businessTags,
  businesses,
  categories,
  interactions,
  leads,
  municipalities,
  reviewSnapshots,
  socialSnapshots,
  states,
  tags,
  type LeadStage,
} from "@/db/schema";
import { slugify } from "@/lib/format/slug";
import { recomputeScores } from "@/server/scoring-service";

import { CATEGORIES, TAGS } from "./categories";
import { DEMO_BUSINESSES, type DemoBusiness } from "./demo-businesses";
import { MERIDA_MUNICIPALITIES, STATES } from "./geo";

const DAY = 86_400_000;
const reset = process.argv.includes("--reset");

/** Small deterministic PRNG so the demo data is the same on every machine. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedGeography() {
  for (const s of STATES) {
    await db
      .insert(states)
      .values({ ...s, slug: slugify(s.name) })
      .onConflictDoUpdate({
        target: states.isoCode,
        set: { name: s.name, capital: s.capital, slug: slugify(s.name) },
      });
  }
  const [merida] = await db.select().from(states).where(eq(states.isoCode, "VE-L"));
  if (!merida) throw new Error("No se encontró Mérida");

  for (const m of MERIDA_MUNICIPALITIES) {
    await db
      .insert(municipalities)
      .values({
        stateId: merida.id,
        name: m.name,
        slug: slugify(m.name),
        seat: m.seat,
        center: { lng: m.lng, lat: m.lat },
      })
      .onConflictDoUpdate({
        target: [municipalities.stateId, municipalities.slug],
        set: { name: m.name, seat: m.seat, center: { lng: m.lng, lat: m.lat } },
      });
  }
  console.log(`✔ ${STATES.length} estados y ${MERIDA_MUNICIPALITIES.length} municipios de Mérida`);
  return merida.id;
}

async function seedCategories() {
  let order = 0;
  for (const root of CATEGORIES) {
    const [r] = await db
      .insert(categories)
      .values({
        slug: root.slug,
        name: root.name,
        icon: root.icon,
        servesFood: root.servesFood ?? false,
        sortOrder: order++,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: root.name,
          icon: root.icon,
          servesFood: root.servesFood ?? false,
          parentId: null,
        },
      })
      .returning();
    if (!r) continue;
    for (const child of root.children ?? []) {
      await db
        .insert(categories)
        .values({
          slug: child.slug,
          name: child.name,
          icon: child.icon,
          parentId: r.id,
          sortOrder: order++,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { name: child.name, icon: child.icon, parentId: r.id },
        });
    }
  }
  for (const t of TAGS) {
    await db
      .insert(tags)
      .values(t)
      .onConflictDoUpdate({ target: tags.slug, set: { name: t.name, color: t.color } });
  }
  console.log(
    `✔ ${CATEGORIES.length} categorías principales con subcategorías y ${TAGS.length} etiquetas`,
  );
}

const between = (rand: () => number, min: number, max: number) => min + rand() * (max - min);
const intBetween = (rand: () => number, min: number, max: number) =>
  Math.round(between(rand, min, max));

function socialSeries(b: DemoBusiness, rand: () => number, now: Date) {
  if (b.social === "none" || b.social === "unmeasured") return [];
  const ranges = {
    weak: { f: [150, 900], p: [0, 3], r: [0, 1], last: [20, 120], er: [0.003, 0.012] },
    mid: { f: [900, 3500], p: [4, 8], r: [1, 3], last: [3, 15], er: [0.012, 0.025] },
    strong: { f: [3000, 15000], p: [10, 20], r: [3, 8], last: [0, 3], er: [0.025, 0.05] },
    facebook_only: { f: [200, 2000], p: [1, 4], r: [0, 0], last: [10, 60], er: [0.005, 0.015] },
  }[b.social];

  const finalFollowers = intBetween(rand, ranges.f[0]!, ranges.f[1]!);
  const isFacebook = b.social === "facebook_only";
  const bioComplete = b.social === "weak" ? rand() > 0.6 : true;
  const hasLink = b.social === "strong" ? true : b.social === "mid" ? rand() > 0.4 : false;
  const promo = (b.tags ?? []).includes("promociones") && b.social !== "weak";

  // Four measurements over three months, growing towards the latest value.
  return [90, 60, 30, 2].map((daysAgo, i) => {
    const capturedAt = new Date(now.getTime() - daysAgo * DAY);
    const growth = 0.82 + i * 0.06;
    const reels = isFacebook ? null : intBetween(rand, ranges.r[0]!, ranges.r[1]!);
    return {
      platform: isFacebook ? ("facebook" as const) : ("instagram" as const),
      followers: Math.round(finalFollowers * growth),
      postsLast30d: intBetween(rand, ranges.p[0]!, ranges.p[1]!),
      reelsLast30d: reels,
      lastPostAt: new Date(
        capturedAt.getTime() - intBetween(rand, ranges.last[0]!, ranges.last[1]!) * DAY,
      ),
      engagementRate: Number(between(rand, ranges.er[0]!, ranges.er[1]!).toFixed(4)),
      usesReels: isFacebook ? false : (reels ?? 0) > 0,
      bioComplete,
      hasLinkInBio: hasLink,
      mentionsPromotions: promo,
      source: "seed" as const,
      capturedAt,
    };
  });
}

function reviewSeries(b: DemoBusiness, rand: () => number, now: Date) {
  if (b.reviews === "none") return [];
  const r = { great: [4.5, 4.9, 80, 450], good: [4.0, 4.4, 20, 120], low: [3.0, 3.7, 5, 40] }[
    b.reviews
  ];
  const rating = Number(between(rand, r[0]!, r[1]!).toFixed(1));
  const count = intBetween(rand, r[2]!, r[3]!);
  return [60, 2].map((daysAgo, i) => ({
    rating,
    reviewCount: i === 0 ? Math.round(count * 0.9) : count,
    source: "seed" as const,
    capturedAt: new Date(now.getTime() - daysAgo * DAY),
  }));
}

async function seedDemoBusinesses(meridaId: number) {
  const existing = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(businesses)
    .where(eq(businesses.source, "seed"));
  if ((existing[0]?.n ?? 0) > 0 && !reset) {
    console.log("• Los negocios demo ya existen (usa --reset para recrearlos)");
    return;
  }
  // Once real businesses are loaded, the demo is only created on request.
  const [real] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(businesses)
    .where(sql`${businesses.source} <> 'seed'`);
  if ((real?.n ?? 0) > 0 && !reset) {
    console.log("• Hay negocios reales: no se crean los DEMO (usa --reset para forzarlos)");
    return;
  }
  await db.delete(businesses).where(eq(businesses.source, "seed"));

  const now = new Date();
  const munis = await db.select().from(municipalities).where(eq(municipalities.stateId, meridaId));
  const muniByName = new Map(munis.map((m) => [m.name, m]));
  const cats = await db.select().from(categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  const tagRows = await db.select().from(tags);
  const tagBySlug = new Map(tagRows.map((t) => [t.slug, t]));

  const created: { id: number; demo: DemoBusiness }[] = [];
  for (const [i, b] of DEMO_BUSINESSES.entries()) {
    const rand = mulberry32(1000 + i);
    const muni = muniByName.get(b.municipality);
    const cat = catBySlug.get(b.category);
    if (!muni?.center || !cat) throw new Error(`Datos demo inválidos: ${b.name}`);
    const spread = b.municipality === "Libertador" ? 0.018 : 0.008;
    const handle = slugify(b.name).replace(/-/g, "");
    const phoneSuffix = String(100 + i).padStart(3, "0");
    const hasPhone = b.social !== "none" || rand() > 0.3;

    const [row] = await db
      .insert(businesses)
      .values({
        name: b.name,
        categoryId: cat.id,
        stateId: meridaId,
        municipalityId: muni.id,
        sector: b.sector,
        address: `Sector ${b.sector}, ${muni.seat ?? muni.name}`,
        location: {
          lng: muni.center.lng + between(rand, -spread, spread),
          lat: muni.center.lat + between(rand, -spread, spread),
        },
        onMainRoad: b.onMainRoad,
        hasDigitalMenu: b.hasDigitalMenu,
        phone: hasPhone ? `+58 414-0000${phoneSuffix}` : null,
        whatsapp: hasPhone ? `+584140000${phoneSuffix}` : null,
        instagram: ["weak", "mid", "strong", "unmeasured"].includes(b.social)
          ? `demo.${handle}`
          : null,
        facebook: b.social === "facebook_only" || b.social === "strong" ? `demo.${handle}` : null,
        tiktok: b.social === "strong" && rand() > 0.5 ? `demo.${handle}` : null,
        source: "seed",
      })
      .returning({ id: businesses.id });
    if (!row) continue;
    created.push({ id: row.id, demo: b });

    const social = socialSeries(b, rand, now);
    if (social.length)
      await db.insert(socialSnapshots).values(social.map((s) => ({ ...s, businessId: row.id })));
    const reviews = reviewSeries(b, rand, now);
    if (reviews.length)
      await db.insert(reviewSnapshots).values(reviews.map((r) => ({ ...r, businessId: row.id })));
    const tagIds = (b.tags ?? [])
      .map((t) => tagBySlug.get(t)?.id)
      .filter((id): id is number => id !== undefined);
    if (tagIds.length)
      await db.insert(businessTags).values(tagIds.map((tagId) => ({ businessId: row.id, tagId })));
  }

  // A few demo leads so the pipeline is not empty on first run.
  const demoLeads: Array<[string, LeadStage, string]> = [
    ["Café La Neblina", "contacted", "Le escribí por WhatsApp ofreciendo reels del café"],
    ["Trucha y Leña", "replied", "Respondió interesado en un menú digital"],
    ["Hotel Mirador del Chama", "meeting", "Reunión el jueves para video del hotel"],
    ["Cervecería Artesanal Mucujún", "proposal", "Enviada propuesta: 4 reels + flyer de evento"],
    ["Barbería El Caballero", "won", "Cerrado: paquete mensual de contenido"],
  ];
  for (const [name, stage, note] of demoLeads) {
    const b = created.find((c) => c.demo.name === name);
    if (!b) continue;
    const [lead] = await db
      .insert(leads)
      .values({
        businessId: b.id,
        stage,
        nextActionAt: new Date(now.getTime() + 3 * DAY),
        nextActionNote: "Hacer seguimiento",
      })
      .returning();
    if (lead)
      await db.insert(interactions).values({
        leadId: lead.id,
        kind: "whatsapp",
        body: note,
        occurredAt: new Date(now.getTime() - DAY),
      });
  }

  console.log(`✔ ${created.length} negocios demo (source = "seed") con métricas e historial`);
}

async function main() {
  const meridaId = await seedGeography();
  await seedCategories();
  await seedDemoBusinesses(meridaId);
  const n = await recomputeScores(db);
  console.log(`✔ Puntajes calculados para ${n} negocios`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
