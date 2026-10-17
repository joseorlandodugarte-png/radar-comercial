import { distanceMeters } from "@/lib/geo";
import { nameSimilarity } from "@/lib/import/dedupe";

/** Google Places API (New) — https://developers.google.com/maps/documentation/places/web-service/op-overview */

export const PLACES_BASE = "https://places.googleapis.com/v1";

/** Only what we need: identity, location for matching, and reputation. Fewer fields = cheaper SKU. */
export const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.rating",
  "places.userRatingCount",
].join(",");

export const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "rating",
  "userRatingCount",
].join(",");

export type GooglePlace = {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
};

export function textSearchBody(
  query: string,
  center: { lat: number; lng: number } | null,
  radiusMeters = 300,
) {
  return {
    textQuery: query,
    languageCode: "es",
    regionCode: "VE",
    maxResultCount: 5,
    ...(center
      ? {
          locationBias: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: radiusMeters,
            },
          },
        }
      : {}),
  };
}

export function mapPlaceReview(place: GooglePlace) {
  return {
    placeId: place.id,
    name: place.displayName?.text ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    // Missing in the response means Google has no reviews: keep null ("Sin dato"), never 0.
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
  };
}

/** Accept a result only if the name is similar and (when we know where it is) it is close by. */
export function bestPlaceMatch(
  target: { name: string; location: { lat: number; lng: number } | null },
  places: GooglePlace[],
  opts = { maxMeters: 300, minSimilarity: 0.6 },
): GooglePlace | null {
  let best: { place: GooglePlace; score: number } | null = null;
  for (const p of places) {
    const sim = nameSimilarity(target.name, p.displayName?.text ?? "");
    if (sim < opts.minSimilarity) continue;
    if (target.location && p.location) {
      const d = distanceMeters(target.location, {
        lat: p.location.latitude,
        lng: p.location.longitude,
      });
      if (d > opts.maxMeters) continue;
    }
    if (!best || sim > best.score) best = { place: p, score: sim };
  }
  return best?.place ?? null;
}
