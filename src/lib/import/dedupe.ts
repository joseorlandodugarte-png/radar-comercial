import { distanceMeters, type LatLng } from "@/lib/geo";
import { slugify } from "@/lib/format/slug";
import { normalizeVePhone } from "@/lib/links/whatsapp";

export type DedupeCandidate = {
  name: string;
  instagram?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  googlePlaceId?: string | null;
  osmId?: string | null;
  location?: LatLng | null;
};

export type DedupeExisting = DedupeCandidate & { id: number };

export type DuplicateMatch = { id: number; reason: string; confidence: "exact" | "likely" };

const NEARBY_METERS = 100;
const NAME_SIMILARITY = 0.6;

/** Words that do not identify a business ("Restaurante El Sabor" ≈ "El Sabor"). */
const STOPWORDS = new Set([
  "restaurante",
  "cafe",
  "bar",
  "panaderia",
  "la",
  "el",
  "los",
  "las",
  "de",
  "del",
  "y",
  "c",
  "a",
  "ca",
]);

export function normalizeName(name: string): string {
  return slugify(name)
    .split("-")
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ");
}

function bigrams(s: string): Set<string> {
  const clean = s.replace(/\s+/g, " ");
  const out = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2));
  return out;
}

/** Dice coefficient over character bigrams, 0-1. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const A = bigrams(na);
  const B = bigrams(nb);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return (2 * shared) / (A.size + B.size);
}

const phones = (c: DedupeCandidate) =>
  [normalizeVePhone(c.phone), normalizeVePhone(c.whatsapp)].filter((p): p is string => p !== null);

/** Finds the best existing match for a candidate business, strongest evidence first. */
export function findDuplicate(
  candidate: DedupeCandidate,
  existing: DedupeExisting[],
): DuplicateMatch | null {
  const ig = candidate.instagram?.toLowerCase();
  const candidatePhones = phones(candidate);
  let likely: DuplicateMatch | null = null;

  for (const e of existing) {
    if (candidate.googlePlaceId && candidate.googlePlaceId === e.googlePlaceId)
      return { id: e.id, reason: "Mismo lugar de Google", confidence: "exact" };
    if (candidate.osmId && candidate.osmId === e.osmId)
      return { id: e.id, reason: "Mismo elemento de OpenStreetMap", confidence: "exact" };
    if (ig && ig === e.instagram?.toLowerCase())
      return { id: e.id, reason: `Mismo Instagram (@${ig})`, confidence: "exact" };
    if (candidatePhones.length && phones(e).some((p) => candidatePhones.includes(p)))
      return { id: e.id, reason: "Mismo teléfono", confidence: "exact" };

    if (!likely && candidate.location && e.location) {
      const meters = distanceMeters(candidate.location, e.location);
      if (meters <= NEARBY_METERS && nameSimilarity(candidate.name, e.name) >= NAME_SIMILARITY) {
        likely = {
          id: e.id,
          reason: `Nombre parecido a ${Math.round(meters)} m`,
          confidence: "likely",
        };
      }
    }
    if (
      !likely &&
      !candidate.location &&
      normalizeName(candidate.name) === normalizeName(e.name) &&
      normalizeName(e.name)
    ) {
      likely = { id: e.id, reason: "Mismo nombre", confidence: "likely" };
    }
  }
  return likely;
}
