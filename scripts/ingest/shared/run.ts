import { eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { ingestionRuns, type DataSource } from "@/db/schema";

/** Records each ingestion run (not in dry-run) so you can see what was imported and when. */
export async function trackRun<T extends Record<string, unknown>>(
  db: Db,
  source: DataSource,
  opts: { dryRun: boolean; params: Record<string, unknown> },
  body: () => Promise<T>,
): Promise<T> {
  if (opts.dryRun) return body();
  const [run] = await db
    .insert(ingestionRuns)
    .values({ source, dryRun: false, params: opts.params })
    .returning();
  try {
    const stats = await body();
    if (run)
      await db
        .update(ingestionRuns)
        .set({ status: "ok", stats, finishedAt: new Date() })
        .where(eq(ingestionRuns.id, run.id));
    return stats;
  } catch (err) {
    if (run)
      await db
        .update(ingestionRuns)
        .set({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        })
        .where(eq(ingestionRuns.id, run.id));
    throw err;
  }
}
