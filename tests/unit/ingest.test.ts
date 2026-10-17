import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { bestPlaceMatch, mapPlaceReview, textSearchBody } from "@/lib/ingest/google";
import { fetchWithRetry } from "@/lib/ingest/http";
import {
  classifyGraphError,
  mapBusinessDiscovery,
  businessDiscoveryUrl,
} from "@/lib/ingest/instagram";
import {
  businessesQuery,
  categoryForTags,
  cleanMunicipalityName,
  mapOsmElement,
  type OsmElement,
} from "@/lib/ingest/osm";

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, "../fixtures", name), "utf8"));

describe("OpenStreetMap mapping", () => {
  const elements: OsmElement[] = fixture("overpass-sample.json").elements;

  it("maps named businesses with category, coordinates and contacts", () => {
    expect(mapOsmElement(elements[0]!)).toMatchObject({
      osmId: "node/9000000001",
      name: "Fixture Restaurante Andino",
      categorySlug: "restaurantes",
      lat: 8.5931,
      lng: -71.1452,
      phone: "+58 274 000 0001",
      instagram: "fixture.andino",
      address: "Avenida 3 20-45",
      sector: "Centro",
    });
  });

  it("uses the centre of ways and detects barbers", () => {
    expect(mapOsmElement(elements[1]!)).toMatchObject({
      osmId: "way/9000000002",
      lat: 8.6012,
      categorySlug: "panaderias",
    });
    expect(mapOsmElement(elements[2]!)?.categorySlug).toBe("barberias");
  });

  it("skips things that are not businesses or have no name", () => {
    expect(mapOsmElement(elements[3]!)).toBeNull();
    expect(mapOsmElement(elements[4]!)).toBeNull();
  });

  it("maps unknown shops to the generic Comercio category", () => {
    expect(categoryForTags({ shop: "musical_instrument" })).toBe("comercio");
    expect(categoryForTags({ amenity: "parking" })).toBeNull();
  });

  it("builds an Overpass query for the state's ISO code", () => {
    const q = businessesQuery("VE-L");
    expect(q).toContain('area["ISO3166-2"="VE-L"]');
    expect(q).toContain("out center tags;");
  });

  it("cleans municipality names from OSM", () => {
    expect(cleanMunicipalityName("Municipio Libertador")).toBe("Libertador");
    expect(cleanMunicipalityName("Municipio Autónomo Campo Elías")).toBe("Campo Elías");
  });
});

describe("Google Places mapping", () => {
  it("keeps missing ratings as null, never 0", () => {
    expect(mapPlaceReview({ id: "ChIJx" })).toMatchObject({
      placeId: "ChIJx",
      rating: null,
      reviewCount: null,
    });
    expect(mapPlaceReview({ id: "ChIJy", rating: 4.6, userRatingCount: 120 })).toMatchObject({
      rating: 4.6,
      reviewCount: 120,
    });
  });

  it("biases the search around the business", () => {
    expect(textSearchBody("Café, Mérida", { lat: 8.5, lng: -71.1 })).toMatchObject({
      regionCode: "VE",
      locationBias: { circle: { center: { latitude: 8.5, longitude: -71.1 }, radius: 300 } },
    });
    expect(textSearchBody("x", null)).not.toHaveProperty("locationBias");
  });

  it("matches only a similar name close by", () => {
    const target = { name: "Café La Neblina", location: { lat: 8.59, lng: -71.15 } };
    const near = {
      id: "a",
      displayName: { text: "Café La Neblina Mérida" },
      location: { latitude: 8.5901, longitude: -71.1501 },
    };
    const far = {
      id: "b",
      displayName: { text: "Café La Neblina" },
      location: { latitude: 8.7, longitude: -71.3 },
    };
    const other = {
      id: "c",
      displayName: { text: "Ferretería Central" },
      location: { latitude: 8.59, longitude: -71.15 },
    };
    expect(bestPlaceMatch(target, [far, other, near])?.id).toBe("a");
    expect(bestPlaceMatch(target, [far, other])).toBeNull();
  });
});

describe("Instagram Business Discovery mapping", () => {
  const now = new Date("2026-10-17T12:00:00Z");

  it("derives posts, reels, recency and engagement from recent media", () => {
    const r = mapBusinessDiscovery(fixture("instagram-business-discovery.json"), now);
    expect(r).toMatchObject({
      igUserId: "17841400000000000",
      followers: 2000,
      postsLast30d: 3,
      reelsLast30d: 1,
      usesReels: true,
      bioComplete: true,
      hasLinkInBio: true,
      mentionsPromotions: true,
    });
    expect(r?.lastPostAt?.toISOString()).toBe("2026-10-15T14:00:00.000Z");
    // (90 + 30 + 20) / 3 posts with visible likes / 2000 followers
    expect(r?.engagementRate).toBeCloseTo(140 / 3 / 2000, 5);
  });

  it("leaves unknown values as null instead of zero", () => {
    const r = mapBusinessDiscovery({ business_discovery: { id: "1", followers_count: 0 } }, now);
    expect(r).toMatchObject({
      followers: 0,
      postsLast30d: null,
      reelsLast30d: null,
      engagementRate: null,
      usesReels: null,
      lastPostAt: null,
    });
    expect(mapBusinessDiscovery({}, now)).toBeNull();
  });

  it("classifies Graph API errors", () => {
    expect(classifyGraphError({ message: "Invalid user id", code: 110 })).toBe("not_available");
    expect(
      classifyGraphError({ message: "Cannot find User", code: 100, error_subcode: 2207013 }),
    ).toBe("not_available");
    expect(classifyGraphError({ message: "rate", code: 4 })).toBe("rate_limited");
    expect(classifyGraphError({ message: "expired", code: 190 })).toBe("auth");
    expect(classifyGraphError(undefined)).toBe("other");
  });

  it("builds the Business Discovery URL with the handle", () => {
    const url = new URL(
      businessDiscoveryUrl({ igUserId: "123", handle: "fixture.cafe", token: "t" }),
    );
    expect(url.pathname).toBe("/v23.0/123");
    expect(url.searchParams.get("fields")).toContain("business_discovery.username(fixture.cafe)");
  });
});

describe("fetchWithRetry", () => {
  const sleep = vi.fn(async () => {});

  it("retries 5xx and 429 with exponential backoff, then succeeds", async () => {
    const responses = [
      new Response("", { status: 503 }),
      new Response("", { status: 429 }),
      new Response("ok", { status: 200 }),
    ];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => responses.shift()!);
    const delays: number[] = [];
    const res = await fetchWithRetry(
      "https://x",
      {},
      { sleep, onRetry: (_n, _w, ms) => delays.push(ms) },
    );
    expect(res.status).toBe(200);
    expect(delays).toEqual([1000, 2000]);
    fetchMock.mockRestore();
  });

  it("does not retry other 4xx errors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 400 }));
    const res = await fetchWithRetry("https://x", {}, { sleep });
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it("gives up after the configured retries on network errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));
    await expect(fetchWithRetry("https://x", {}, { sleep, retries: 2 })).rejects.toThrow(
      "ECONNRESET",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockRestore();
  });
});
