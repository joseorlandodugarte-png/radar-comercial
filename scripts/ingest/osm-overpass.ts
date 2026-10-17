/**
 * OpenStreetMap (Overpass API) → businesses, main roads and municipal boundaries.
 *
 *   pnpm ingest:osm --dry-run                 # show what would be imported for Mérida
 *   pnpm ingest:osm                           # import businesses + mark businesses on main roads
 *   pnpm ingest:osm --boundaries              # also load municipal boundaries
 *   pnpm ingest:osm --municipality=libertador --limit=100
 *   pnpm ingest:osm --from-file=overpass.json # use a saved Overpass response (offline)
 *
 * Data © OpenStreetMap contributors, ODbL. The app shows the attribution on every map.
 */
import { readFile } from "node:fs/promises";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db, pgClient } from "@/db/client";
import { businesses, categories, municipalities } from "@/db/schema";
import { findDuplicate, type DedupeExisting } from "@/lib/import/dedupe";
import { fetchWithRetry } from "@/lib/ingest/http";
import {
  businessesQuery,
  cleanMunicipalityName,
  mainRoadsQuery,
  mapOsmElement,
  municipalBoundariesQuery,
  type OsmBusiness,
  type OsmElement,
} from "@/lib/ingest/osm";
import { slugify } from "@/lib/format/slug";
import { recomputeScores } from "@/server/scoring-service";

import { log, parseCli } from "./shared/cli";
import { municipalityForPoint, resolveState } from "./shared/geo";
import { trackRun } from "./shared/run";

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const MAIN_ROAD_METERS = 25;

type OverpassResponse = {
  elements: (OsmElement & {
    geometry?: { lat: number; lon: number }[];
    members?: OverpassMember[];
  })[];
};
type OverpassMember = { type: string; role: string; geometry?: { lat: number; lon: number }[] };

async function overpass(query: string): Promise<OverpassResponse> {
  const res = await fetchWithRetry(
    OVERPASS_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "RadarComercialVE/0.1",
      },
      body: `data=${encodeURIComponent(query)}`,
    },
    {
      retries: 3,
      baseDelayMs: 5000,
      onRetry: (n, why, ms) => log.warn(`Overpass: reintento ${n} en ${ms / 1000}s (${why})`),
    },
  );
  if (!res.ok)
    throw new Error(`Overpass respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as OverpassResponse;
}

async function main() {
  const cli = parseCli();
  const state = await resolveState(db, cli.state);
  const fromFile = cli.values.get("from-file");

  await trackRun(
    db,
    "osm",
    { dryRun: cli.dryRun, params: Object.fromEntries(cli.values) },
    async () => {
      log.info(
        `Consultando OpenStreetMap para ${state.name} (${state.isoCode})${fromFile ? ` desde ${fromFile}` : ""}…`,
      );
      // Boundaries first, so each business lands in the polygon that contains it
      // instead of the nearest municipal seat.
      let boundaries = 0;
      if (cli.flags.has("boundaries"))
        boundaries = await loadBoundaries(state.isoCode, state.id, cli.dryRun);

      const raw: OverpassResponse = fromFile
        ? JSON.parse(await readFile(fromFile, "utf8"))
        : await overpass(businessesQuery(state.isoCode));

      const seen = new Set<string>();
      let found: OsmBusiness[] = [];
      for (const el of raw.elements) {
        const b = mapOsmElement(el);
        if (b && !seen.has(b.osmId)) {
          seen.add(b.osmId);
          found.push(b);
        }
      }
      log.ok(
        `${found.length} negocios con nombre y categoría en OSM (${raw.elements.length} elementos)`,
      );

      const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
      const catId = new Map(cats.map((c) => [c.slug, c.id]));
      const munis = await db
        .select()
        .from(municipalities)
        .where(eq(municipalities.stateId, state.id));
      const muniFilter = cli.municipality ? munis.find((m) => m.slug === cli.municipality) : null;
      if (cli.municipality && !muniFilter)
        throw new Error(`Municipio desconocido: ${cli.municipality}`);

      // Assign municipality before filtering/limiting.
      const withMuni: Array<OsmBusiness & { municipalityId: number | null }> = [];
      for (const b of found) {
        const municipalityId = await municipalityForPoint(db, state.id, b.lng, b.lat);
        if (muniFilter && municipalityId !== muniFilter.id) continue;
        withMuni.push({ ...b, municipalityId });
      }
      found = withMuni;
      const batch = cli.limit ? withMuni.slice(0, cli.limit) : withMuni;

      const existingRows = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          instagram: businesses.instagram,
          phone: businesses.phone,
          whatsapp: businesses.whatsapp,
          osmId: businesses.osmId,
          googlePlaceId: businesses.googlePlaceId,
          location: businesses.location,
        })
        .from(businesses)
        .where(eq(businesses.stateId, state.id));
      const existing: DedupeExisting[] = existingRows;

      let created = 0;
      let linked = 0;
      let skippedCategory = 0;
      const touched: number[] = [];

      for (const b of batch) {
        const categoryId = catId.get(b.categorySlug);
        if (!categoryId) {
          skippedCategory++;
          continue;
        }
        const match = findDuplicate(
          {
            name: b.name,
            osmId: b.osmId,
            instagram: b.instagram,
            phone: b.phone,
            whatsapp: b.whatsapp,
            location: { lat: b.lat, lng: b.lng },
          },
          existing,
        );
        if (cli.dryRun) {
          if (match) linked++;
          else created++;
          continue;
        }
        if (match) {
          // Link and fill gaps only; never overwrite what is already there.
          await db
            .update(businesses)
            .set({
              osmId: sql`coalesce(${businesses.osmId}, ${b.osmId})`,
              phone: sql`coalesce(${businesses.phone}, ${b.phone})`,
              whatsapp: sql`coalesce(${businesses.whatsapp}, ${b.whatsapp})`,
              website: sql`coalesce(${businesses.website}, ${b.website})`,
              instagram: sql`coalesce(${businesses.instagram}, ${b.instagram})`,
              facebook: sql`coalesce(${businesses.facebook}, ${b.facebook})`,
              address: sql`coalesce(${businesses.address}, ${b.address})`,
              sector: sql`coalesce(${businesses.sector}, ${b.sector})`,
            })
            .where(eq(businesses.id, match.id));
          touched.push(match.id);
          linked++;
        } else {
          const [row] = await db
            .insert(businesses)
            .values({
              name: b.name,
              categoryId,
              stateId: state.id,
              municipalityId: b.municipalityId,
              sector: b.sector,
              address: b.address,
              location: { lat: b.lat, lng: b.lng },
              phone: b.phone,
              whatsapp: b.whatsapp,
              website: b.website,
              instagram: b.instagram,
              facebook: b.facebook,
              osmId: b.osmId,
              source: "osm",
            })
            .onConflictDoNothing()
            .returning({ id: businesses.id });
          if (row) {
            touched.push(row.id);
            existing.push({
              id: row.id,
              name: b.name,
              osmId: b.osmId,
              instagram: b.instagram,
              phone: b.phone,
              location: { lat: b.lat, lng: b.lng },
            });
            created++;
          }
        }
      }

      if (cli.dryRun) {
        const byCat = new Map<string, number>();
        for (const b of batch) byCat.set(b.categorySlug, (byCat.get(b.categorySlug) ?? 0) + 1);
        log.dry(`Se crearían ${created} negocios y se vincularían ${linked} existentes`);
        log.dry(`Por categoría: ${[...byCat].map(([k, v]) => `${k} ${v}`).join(", ")}`);
        for (const b of batch.slice(0, 5))
          log.dry(
            `Ejemplo: ${b.name} (${b.categorySlug}) ${b.osmId} @ ${b.lat.toFixed(4)},${b.lng.toFixed(4)}`,
          );
      } else {
        log.ok(`${created} negocios nuevos, ${linked} existentes vinculados con OSM`);
      }

      let onMainRoad = 0;
      if (!cli.flags.has("no-roads") && !fromFile)
        onMainRoad = await markMainRoads(state.isoCode, state.id, cli.dryRun);

      if (!cli.dryRun && touched.length) {
        await recomputeScores(db, touched);
        log.ok(`Puntajes recalculados para ${touched.length} negocios`);
      }
      return { found: found.length, created, linked, skippedCategory, onMainRoad, boundaries };
    },
  );
}

/** Marks businesses within 25 m of a motorway/trunk/primary/secondary road. Only fills unknown values. */
async function markMainRoads(isoCode: string, stateId: number, dryRun: boolean) {
  log.info("Consultando vías principales en OSM…");
  const roads = await overpass(mainRoadsQuery(isoCode));
  const lines = roads.elements
    .filter((e) => (e.geometry?.length ?? 0) >= 2)
    .map((e) => `LINESTRING(${e.geometry!.map((p) => `${p.lon} ${p.lat}`).join(",")})`);
  log.ok(`${lines.length} tramos de vías principales`);
  if (lines.length === 0) return 0;

  const multi = `SRID=4326;MULTILINESTRING(${lines.map((l) => l.slice("LINESTRING".length)).join(",")})`;
  const where = and(
    eq(businesses.stateId, stateId),
    isNull(businesses.onMainRoad),
    sql`${businesses.location} is not null`,
  );
  const near = sql`ST_DWithin(${businesses.location}::geography, ST_GeomFromEWKT(${multi})::geography, ${MAIN_ROAD_METERS})`;
  if (dryRun) {
    const [r] = await db
      .select({ n: sql<number>`count(*) filter (where ${near})::int` })
      .from(businesses)
      .where(where);
    log.dry(`${r?.n ?? 0} negocios quedarían marcados en vía principal`);
    return r?.n ?? 0;
  }
  const updated = await db
    .update(businesses)
    .set({ onMainRoad: near })
    .where(where)
    .returning({ id: businesses.id, on: businesses.onMainRoad });
  const n = updated.filter((u) => u.on).length;
  if (updated.length)
    await recomputeScores(
      db,
      updated.map((u) => u.id),
    );
  log.ok(`${n} negocios marcados en vía principal (${updated.length - n} no lo están)`);
  return n;
}

/** Builds municipal polygons from the boundary ways with PostGIS (ST_BuildArea). */
async function loadBoundaries(isoCode: string, stateId: number, dryRun: boolean) {
  log.info("Consultando límites municipales en OSM…");
  const res = await overpass(municipalBoundariesQuery(isoCode));
  const munis = await db.select().from(municipalities).where(eq(municipalities.stateId, stateId));
  let loaded = 0;
  for (const rel of res.elements) {
    const name = rel.tags?.name ? cleanMunicipalityName(rel.tags.name) : null;
    const muni = name ? munis.find((m) => m.slug === slugify(name)) : undefined;
    const ways = (rel.members ?? []).filter(
      (m) => m.type === "way" && (m.geometry?.length ?? 0) >= 2,
    );
    if (!muni || ways.length === 0) {
      if (name) log.warn(`Límite sin municipio equivalente: ${rel.tags?.name}`);
      continue;
    }
    if (dryRun) {
      log.dry(`Límite de ${muni.name}: ${ways.length} tramos`);
      loaded++;
      continue;
    }
    const collection = `SRID=4326;GEOMETRYCOLLECTION(${ways
      .map((w) => `LINESTRING(${w.geometry!.map((p) => `${p.lon} ${p.lat}`).join(",")})`)
      .join(",")})`;
    const updated = await db
      .update(municipalities)
      .set({
        boundary: sql`ST_Multi(ST_CollectionExtract(ST_BuildArea(ST_GeomFromEWKT(${collection})), 3))`,
      })
      .where(eq(municipalities.id, muni.id))
      .returning({ id: municipalities.id });
    if (updated.length) loaded++;
  }
  log.ok(`${loaded} límites municipales ${dryRun ? "se cargarían" : "cargados"}`);
  return loaded;
}

main()
  .catch((err) => {
    console.error("✖", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
