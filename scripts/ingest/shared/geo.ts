import { eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { states } from "@/db/schema";

export { municipalityForPoint } from "@/db/geo-queries";

export async function resolveState(db: Db, slug: string) {
  const [state] = await db.select().from(states).where(eq(states.slug, slug));
  if (!state) throw new Error(`Estado desconocido: ${slug}. Ejecuta pnpm db:seed primero.`);
  return state;
}
