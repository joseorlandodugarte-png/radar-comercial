import "server-only";

import { eq, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { businesses } from "@/db/schema";
import { findDuplicate, type DedupeCandidate } from "@/lib/import/dedupe";
import { normalizeVePhone } from "@/lib/links/whatsapp";

/** Loads plausible matches from the database, then applies the pure matching rules. */
export async function findExistingDuplicate(candidate: DedupeCandidate & { stateId: number }) {
  const phones = [candidate.phone, candidate.whatsapp]
    .map(normalizeVePhone)
    .filter((p): p is string => p !== null);
  const conds = [
    sql`similarity(${businesses.name}, ${candidate.name}) > 0.35 and ${businesses.stateId} = ${candidate.stateId}`,
  ];
  if (candidate.instagram)
    conds.push(sql`lower(${businesses.instagram}) = ${candidate.instagram.toLowerCase()}`);
  if (candidate.googlePlaceId) conds.push(eq(businesses.googlePlaceId, candidate.googlePlaceId));
  if (candidate.osmId) conds.push(eq(businesses.osmId, candidate.osmId));
  for (const p of phones) {
    const local = p.slice(-10);
    conds.push(
      sql`regexp_replace(coalesce(${businesses.phone}, ''), '\\D', '', 'g') like ${"%" + local}`,
    );
    conds.push(
      sql`regexp_replace(coalesce(${businesses.whatsapp}, ''), '\\D', '', 'g') like ${"%" + local}`,
    );
  }
  if (candidate.location) {
    conds.push(
      sql`ST_DWithin(${businesses.location}::geography, ST_SetSRID(ST_MakePoint(${candidate.location.lng}, ${candidate.location.lat}), 4326)::geography, 150)`,
    );
  }

  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      instagram: businesses.instagram,
      phone: businesses.phone,
      whatsapp: businesses.whatsapp,
      googlePlaceId: businesses.googlePlaceId,
      osmId: businesses.osmId,
      location: businesses.location,
    })
    .from(businesses)
    .where(or(...conds))
    .limit(50);

  const match = findDuplicate(candidate, rows);
  if (!match) return null;
  const row = rows.find((r) => r.id === match.id);
  return { ...match, name: row?.name ?? "" };
}
