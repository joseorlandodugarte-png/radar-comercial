import { and, eq, sql } from "drizzle-orm";

import type { Db } from "./client";
import { municipalities } from "./schema";

/**
 * Municipality containing a point (when boundaries are loaded) or, failing that,
 * the one whose seat is closest. Returns null when no seat is within 40 km.
 */
export async function municipalityForPoint(
  db: Db,
  stateId: number,
  lng: number,
  lat: number,
): Promise<number | null> {
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
  const [inside] = await db
    .select({ id: municipalities.id })
    .from(municipalities)
    .where(
      and(
        eq(municipalities.stateId, stateId),
        sql`ST_Contains(${municipalities.boundary}, ${point})`,
      ),
    )
    .limit(1);
  if (inside) return inside.id;
  const [nearest] = await db
    .select({
      id: municipalities.id,
      meters: sql<number>`ST_DistanceSphere(${municipalities.center}, ${point})`,
    })
    .from(municipalities)
    .where(and(eq(municipalities.stateId, stateId), sql`${municipalities.center} is not null`))
    .orderBy(sql`${municipalities.center} <-> ${point}`)
    .limit(1);
  return nearest && nearest.meters < 40_000 ? nearest.id : null;
}
