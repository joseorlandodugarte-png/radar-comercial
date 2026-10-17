/**
 * Instagram Graph API (Business Discovery) → a new social snapshot per business with Instagram.
 *
 *   pnpm ingest:instagram --dry-run
 *   pnpm ingest:instagram --municipality=libertador --limit=50
 *   pnpm ingest:instagram --stale-days=7     # skip accounts measured in the last 7 days (default)
 *   pnpm ingest:instagram --delay-ms=2000    # pause between calls (Meta allows ~200 calls/hour)
 *
 * Accounts Business Discovery cannot read (personal, private, renamed or non-existent) go to the
 * manual review queue (Más > Revisión manual) instead of getting made-up numbers.
 */
import { and, eq, gt, isNotNull, notExists, sql } from "drizzle-orm";

import { db, pgClient } from "@/db/client";
import { businesses, manualReviewQueue, municipalities, socialSnapshots } from "@/db/schema";
import { fetchWithRetry } from "@/lib/ingest/http";
import {
  IG_REVIEW_REASON,
  businessDiscoveryUrl,
  classifyGraphError,
  mapBusinessDiscovery,
  type BusinessDiscoveryResponse,
} from "@/lib/ingest/instagram";
import { recomputeScores } from "@/server/scoring-service";

import { log, parseCli, requireEnv } from "./shared/cli";
import { resolveState } from "./shared/geo";
import { trackRun } from "./shared/run";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cli = parseCli();
  const state = await resolveState(db, cli.state);
  const staleDays = Number(cli.values.get("stale-days") ?? 7);
  const delayMs = Number(cli.values.get("delay-ms") ?? 1500);

  await trackRun(
    db,
    "instagram_graph",
    { dryRun: cli.dryRun, params: Object.fromEntries(cli.values) },
    async () => {
      const since = new Date(Date.now() - staleDays * 86_400_000);
      const conds = [
        eq(businesses.stateId, state.id),
        isNotNull(businesses.instagram),
        sql`${businesses.source} <> 'seed'`,
        notExists(
          db
            .select({ one: sql`1` })
            .from(socialSnapshots)
            .where(
              and(
                eq(socialSnapshots.businessId, businesses.id),
                eq(socialSnapshots.source, "instagram_graph"),
                gt(socialSnapshots.capturedAt, since),
              ),
            ),
        ),
      ];
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
        .select({ id: businesses.id, name: businesses.name, instagram: businesses.instagram })
        .from(businesses)
        .where(and(...conds))
        .limit(cli.limit ?? 10_000);

      log.info(
        `${targets.length} cuentas de Instagram para medir (sin medición en ${staleDays} días)`,
      );
      if (cli.dryRun) {
        for (const t of targets.slice(0, 10)) log.dry(`Mediría @${t.instagram} (${t.name})`);
        log.dry(
          `Tiempo estimado: ~${Math.ceil((targets.length * delayMs) / 60000)} min con ${delayMs} ms entre llamadas`,
        );
        return { candidates: targets.length };
      }

      const token = requireEnv("META_ACCESS_TOKEN");
      const igUserId = requireEnv("IG_BUSINESS_ACCOUNT_ID");
      const version = process.env.META_GRAPH_VERSION || "v23.0";
      let measured = 0;
      let toReview = 0;
      let errors = 0;
      const touched: number[] = [];

      for (const [i, t] of targets.entries()) {
        if (i > 0) await sleep(delayMs);
        const url = businessDiscoveryUrl({ igUserId, handle: t.instagram!, token, version });
        const res = await fetchWithRetry(
          url,
          {},
          {
            retries: 3,
            baseDelayMs: 5000,
            onRetry: (n, why, ms) =>
              log.warn(`Instagram: reintento ${n} en ${ms / 1000}s (${why})`),
          },
        );
        const json = (await res.json()) as BusinessDiscoveryResponse;
        const mapped = res.ok ? mapBusinessDiscovery(json, new Date()) : null;

        if (mapped) {
          const { igUserId: discoveredId, ...metrics } = mapped;
          await db.transaction(async (tx) => {
            await tx.insert(socialSnapshots).values({
              businessId: t.id,
              platform: "instagram",
              source: "instagram_graph",
              ...metrics,
            });
            await tx
              .update(businesses)
              .set({ igUserId: discoveredId })
              .where(eq(businesses.id, t.id));
          });
          touched.push(t.id);
          measured++;
          continue;
        }

        const kind = classifyGraphError(json.error);
        if (kind === "auth")
          throw new Error(`${IG_REVIEW_REASON.auth}: ${json.error?.message ?? res.status}`);
        if (kind === "rate_limited") {
          log.warn(
            "Límite de la API alcanzado: detengo la corrida. Vuelve a ejecutarla más tarde; seguirá donde quedó.",
          );
          break;
        }
        if (kind === "not_available") {
          const pending = await db
            .select({ id: manualReviewQueue.id })
            .from(manualReviewQueue)
            .where(
              and(
                eq(manualReviewQueue.businessId, t.id),
                eq(manualReviewQueue.status, "pending"),
                eq(manualReviewQueue.source, "instagram_graph"),
              ),
            );
          if (pending.length === 0) {
            await db.insert(manualReviewQueue).values({
              businessId: t.id,
              source: "instagram_graph",
              reason: IG_REVIEW_REASON.not_available,
              payload: { handle: t.instagram, error: json.error ?? null },
            });
          }
          toReview++;
          log.warn(`@${t.instagram}: enviado a revisión manual`);
          continue;
        }
        errors++;
        log.warn(`@${t.instagram}: ${json.error?.message ?? `HTTP ${res.status}`}`);
      }

      if (touched.length) await recomputeScores(db, touched);
      log.ok(`${measured} cuentas medidas, ${toReview} a revisión manual, ${errors} errores`);
      return { candidates: targets.length, measured, toReview, errors };
    },
  );
}

main()
  .catch((err) => {
    console.error("✖", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
