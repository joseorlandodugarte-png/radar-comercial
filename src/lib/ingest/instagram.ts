/**
 * Instagram Graph API — Business Discovery
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery
 * Reads public metrics of OTHER Business/Creator accounts through your own IG business account.
 */

export const MEDIA_LIMIT = 30;
const PROMO_RE = /promo|descuento|oferta|2x1|happy\s*hour|evento|sorteo|combo/i;

export function businessDiscoveryFields(handle: string) {
  const media = `media.limit(${MEDIA_LIMIT}){timestamp,media_type,media_product_type,like_count,comments_count}`;
  return `business_discovery.username(${handle}){id,username,name,biography,website,followers_count,media_count,${media}}`;
}

export function businessDiscoveryUrl(params: {
  igUserId: string;
  handle: string;
  token: string;
  version?: string;
}) {
  const url = new URL(`https://graph.facebook.com/${params.version ?? "v23.0"}/${params.igUserId}`);
  url.searchParams.set("fields", businessDiscoveryFields(params.handle));
  url.searchParams.set("access_token", params.token);
  return url.toString();
}

export type IgMedia = {
  timestamp: string;
  media_type?: string;
  media_product_type?: string;
  like_count?: number;
  comments_count?: number;
};

export type BusinessDiscoveryResponse = {
  business_discovery?: {
    id: string;
    username?: string;
    biography?: string;
    website?: string;
    followers_count?: number;
    media_count?: number;
    media?: { data: IgMedia[] };
  };
  error?: GraphError;
};

export type GraphError = { message: string; type?: string; code?: number; error_subcode?: number };

const DAY = 86_400_000;

/** Turns a Business Discovery response into snapshot fields. Unknown values stay null. */
export function mapBusinessDiscovery(json: BusinessDiscoveryResponse, now: Date) {
  const bd = json.business_discovery;
  if (!bd) return null;
  const media = (bd.media?.data ?? []).filter((m) => !Number.isNaN(Date.parse(m.timestamp)));
  const since = now.getTime() - 30 * DAY;
  const recent = media.filter((m) => Date.parse(m.timestamp) >= since);
  const isReel = (m: IgMedia) =>
    m.media_product_type === "REELS" ||
    (m.media_type === "VIDEO" && m.media_product_type !== "STORY");
  const followers = typeof bd.followers_count === "number" ? bd.followers_count : null;

  // Engagement over the latest 12 posts; posts with hidden like counts are skipped.
  const sample = media.slice(0, 12).filter((m) => typeof m.like_count === "number");
  const engagementRate =
    followers && followers > 0 && sample.length > 0
      ? sample.reduce((s, m) => s + (m.like_count ?? 0) + (m.comments_count ?? 0), 0) /
        sample.length /
        followers
      : null;

  const timestamps = media.map((m) => Date.parse(m.timestamp));
  const bio = bd.biography?.trim() ?? "";
  // With no media returned we cannot tell how often they post: leave the counts as "Sin dato".
  const knowsMedia = bd.media !== undefined;

  return {
    igUserId: bd.id,
    followers,
    postsLast30d: knowsMedia ? recent.length : null,
    reelsLast30d: knowsMedia ? recent.filter(isReel).length : null,
    lastPostAt: timestamps.length ? new Date(Math.max(...timestamps)) : null,
    engagementRate: engagementRate === null ? null : Number(engagementRate.toFixed(5)),
    usesReels: knowsMedia ? media.some(isReel) : null,
    bioComplete: bio.length >= 20,
    hasLinkInBio: Boolean(bd.website),
    mentionsPromotions: PROMO_RE.test(bio),
  };
}

export type IgErrorKind = "not_available" | "rate_limited" | "auth" | "other";

/**
 * Classifies Graph API errors. Personal/private/non-existent accounts are "not_available"
 * and go to manual review; rate limits are retried later; auth errors stop the run.
 */
export function classifyGraphError(err: GraphError | undefined): IgErrorKind {
  if (!err) return "other";
  if (err.code === 190 || err.code === 10 || err.code === 200) return "auth";
  if ([4, 17, 32, 613].includes(err.code ?? -1)) return "rate_limited";
  if (
    err.code === 110 ||
    err.error_subcode === 2207013 ||
    (err.code === 100 && /business_discovery|username|user/i.test(err.message))
  )
    return "not_available";
  return "other";
}

export const IG_REVIEW_REASON: Record<IgErrorKind, string> = {
  not_available: "Instagram no permite leer esta cuenta (personal, privada o el usuario no existe)",
  rate_limited: "Límite de la API de Instagram alcanzado",
  auth: "Token de Meta inválido o vencido",
  other: "Error de la API de Instagram",
};
