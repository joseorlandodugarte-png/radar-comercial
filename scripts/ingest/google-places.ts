/**
 * Google Places API (New) → rating and review count for businesses already in the database.
 *
 *   pnpm ingest:google --dry-run --limit=10
 *   pnpm ingest:google --municipality=libertador
 *   pnpm ingest:google --refresh        # also re-measure businesses that already have a place ID
 *
 * Each measurement is a new review snapshot (source google_places). Following the Google Maps
 * Platform terms, only the place ID is kept indefinitely: Google snapshots older than
 * GOOGLE_CACHE_DAYS (30) are deleted on every run, so re-run at least monthly.
 */
import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db, pgClient } from "@/db/client";
import { businesses, municipalities, reviewSnapshots } from "@/db/schema";
import { fetchWithRetry } from "@/lib/ingest/http";
import {
  DETAILS_FIELD_MASK,
  PLACES_BASE,
  SEARCH_FIELD_MASK,
  bestPlaceMatch,
  mapPlaceReview,
  textSearchBody,
  type GooglePlace,
} from "@/lib/ingest/google";
import { recomputeScores } from "@/server/scoring-service";

import { log, parseCli, requireEnv } from "./shared/cli";
import { resolveState } from "./shared/geo";
import { trackRun } from "./shared/run";

const GOOGLE_CACHE_DAYS = 30;
const MAX_MATCH_METERS = 300;
const MIN_NAME_SIMILARITY = 0.6;

async function main() {
  const cli = parseCli();
  const key = cli.dryRun
    ? (process.env.GOOGLE_PLACES_API_KEY ?? "")
    : requireEnv("GOOGLE_PLACES_API_KEY");
  const state = await resolveState(db, cli.state);
  const refresh = cli.flags.has("refresh");

  await trackRun(
    db,
    "google_places",
    { dryRun: cli.dryRun, params: Object.fromEntries(cli.values) },
    async () => {
      const conds = [eq(businesses.stateId, state.id), sql`${businesses.source} <> 'seed'`];
      if (!refresh) conds.push(isNull(businesses.googlePlaceId));
      if (cli.municipality) {
        const [m] = await db
          .select()
          .from(municipalities)
          .where(
            and(eq(municipalities.stateId, state.id), eq(municipalities.slug, cli.municipality)),
          );
        if (!m) throw new Error(`Municipio desconocido: ${cli.municipality}`);
        conds.push(eq(businesses.municipalityId, m.id));
      }
      const targets = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          sector: businesses.sector,
          placeId: businesses.googlePlaceId,
          location: businesses.location,
          municipality: municipalities.name,
        })
        .from(businesses)
        .leftJoin(municipalities, eq(municipalities.id, businesses.municipalityId))
        .where(and(...conds))
        .limit(cli.limit ?? 10_000);

      log.info(
        `${targets.length} negocios para consultar en Google Places${cli.dryRun ? " (dry-run: sin llamadas a la API)" : ""}`,
      );
      if (cli.dryRun) {
        for (const t of targets.slice(0, 5)) log.dry(`Buscaría: "${queryFor(t, state.name)}"`);
        log.dry(`Costo aproximado: ${targets.length} solicitudes (Text Search o Place Details)`);
        return { candidates: targets.length };
      }

      const headers = { "content-type": "application/json", "X-Goog-Api-Key": key };
      const retry = {
        retries: 3,
        onRetry: (n: number, why: string) => log.warn(`Google: reintento ${n} (${why})`),
      };
      let matched = 0;
      let noMatch = 0;
      let errors = 0;
      const touched: number[] = [];

      for (const t of targets) {
        try {
          let place: GooglePlace | null = null;
          if (t.placeId) {
            const res = await fetchWithRetry(
              `${PLACES_BASE}/places/${encodeURIComponent(t.placeId)}`,
              {
                headers: { ...headers, "X-Goog-FieldMask": DETAILS_FIELD_MASK },
              },
              retry,
            );
            if (res.ok) place = (await res.json()) as GooglePlace;
            else
              throw new Error(`Place Details ${res.status}: ${(await res.text()).slice(0, 200)}`);
          } else {
            const res = await fetchWithRetry(
              `${PLACES_BASE}/places:searchText`,
              {
                method: "POST",
                headers: { ...headers, "X-Goog-FieldMask": SEARCH_FIELD_MASK },
                body: JSON.stringify(
                  textSearchBody(queryFor(t, state.name), t.location, MAX_MATCH_METERS),
                ),
              },
              retry,
            );
            if (!res.ok)
              throw new Error(`Text Search ${res.status}: ${(await res.text()).slice(0, 200)}`);
            const { places = [] } = (await res.json()) as { places?: GooglePlace[] };
            place = bestPlaceMatch(t, places, {
              maxMeters: MAX_MATCH_METERS,
              minSimilarity: MIN_NAME_SIMILARITY,
            });
          }
          if (!place) {
            noMatch++;
            continue;
          }
          const review = mapPlaceReview(place);
          await db.transaction(async (tx) => {
            await tx
              .update(businesses)
              .set({ googlePlaceId: review.placeId })
              .where(eq(businesses.id, t.id));
            await tx.insert(reviewSnapshots).values({
              businessId: t.id,
              rating: review.rating,
              reviewCount: review.reviewCount,
              source: "google_places",
            });
          });
          touched.push(t.id);
          matched++;
        } catch (err) {
          errors++;
          log.warn(`${t.name}: ${err instanceof Error ? err.message : err}`);
          if (err instanceof Error && /\b(401|403)\b/.test(err.message))
            throw new Error(
              "Clave de Google rechazada: revisa GOOGLE_PLACES_API_KEY y que Places API (New) esté activa.",
            );
        }
      }

      const cutoff = new Date(Date.now() - GOOGLE_CACHE_DAYS * 86_400_000);
      const pruned = await db
        .delete(reviewSnapshots)
        .where(
          and(
            eq(reviewSnapshots.source, "google_places"),
            lt(reviewSnapshots.capturedAt, cutoff),
            isNotNull(reviewSnapshots.businessId),
          ),
        )
        .returning({ id: reviewSnapshots.id });

      if (touched.length) await recomputeScores(db, touched);
      log.ok(
        `${matched} con datos de Google, ${noMatch} sin coincidencia, ${errors} errores, ${pruned.length} mediciones viejas borradas`,
      );
      return { candidates: targets.length, matched, noMatch, errors, pruned: pruned.length };
    },
  );
}

function queryFor(
  t: { name: string; sector: string | null; municipality: string | null },
  stateName: string,
) {
  return [t.name, t.sector, t.municipality, stateName, "Venezuela"].filter(Boolean).join(", ");
}

main()
  .catch((err) => {
    console.error("✖", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
