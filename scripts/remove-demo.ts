/**
 * Deletes the fictional demo businesses (source = "seed") and everything hanging
 * off them: snapshots, scores, leads and notes. Real data is untouched.
 *
 *   pnpm db:demo:remove
 */
import { eq } from "drizzle-orm";

import { db, pgClient } from "@/db/client";
import { businesses } from "@/db/schema";

async function main() {
  const removed = await db
    .delete(businesses)
    .where(eq(businesses.source, "seed"))
    .returning({ id: businesses.id });
  console.log(`✔ ${removed.length} negocios DEMO eliminados`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
