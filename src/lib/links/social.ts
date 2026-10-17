/**
 * Extracts an Instagram username from a profile URL or "@handle".
 * Returns null for post/reel/story URLs or anything that is not a profile.
 */
export function parseInstagramHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  const reserved = new Set([
    "p",
    "reel",
    "reels",
    "stories",
    "explore",
    "accounts",
    "tv",
    "direct",
  ]);
  let candidate: string | undefined;

  const urlMatch = value.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#]+)/i,
  );
  if (urlMatch) {
    candidate = urlMatch[1];
    if (candidate && reserved.has(candidate.toLowerCase())) return null;
  } else if (/^@?[\w.]+$/.test(value)) {
    candidate = value.replace(/^@/, "");
  }
  if (!candidate) return null;
  const handle = candidate.toLowerCase();
  // Instagram usernames: 1-30 chars, letters, numbers, periods and underscores.
  return /^[a-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

export function facebookUrl(handle: string): string {
  return handle.startsWith("http") ? handle : `https://www.facebook.com/${handle}`;
}

export function tiktokUrl(handle: string): string {
  return handle.startsWith("http") ? handle : `https://www.tiktok.com/@${handle.replace(/^@/, "")}`;
}

export type ParsedMapsLink = {
  name: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  isShortLink: boolean;
};

const inRange = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Reads name and coordinates from a Google Maps URL (no network calls).
 * Short links (maps.app.goo.gl) must be expanded first by following the redirect.
 */
export function parseGoogleMapsLink(input: string | null | undefined): ParsedMapsLink | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const isShortLink = host === "maps.app.goo.gl" || host === "goo.gl";
  if (!isShortLink && !/^(maps\.)?google\.[a-z.]+$/.test(host)) return null;

  const result: ParsedMapsLink = { name: null, lat: null, lng: null, placeId: null, isShortLink };
  if (isShortLink) return result;

  const path = decodeURIComponent(url.pathname);
  const placeName = path.match(/\/place\/([^/]+)/)?.[1];
  if (placeName) result.name = placeName.replace(/\+/g, " ").trim();

  const full = decodeURIComponent(url.href);
  // Exact pin: !3d<lat>!4d<lng> is the place itself; @lat,lng is only the viewport.
  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const at = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const q = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  const match = pin ?? q ?? at;
  if (match) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (inRange(lat, lng)) {
      result.lat = lat;
      result.lng = lng;
    }
  }
  const placeId =
    url.searchParams.get("query_place_id") ?? full.match(/!1s(ChIJ[\w-]+)/)?.[1] ?? null;
  result.placeId = placeId;
  return result;
}

export function googleMapsUrl(lat: number, lng: number, placeId?: string | null): string {
  const base = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return placeId ? `${base}&query_place_id=${encodeURIComponent(placeId)}` : base;
}
