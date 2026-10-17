import { describe, expect, it } from "vitest";

import { parseGoogleMapsLink, parseInstagramHandle } from "@/lib/links/social";
import { normalizeVePhone, whatsappMessage, whatsappUrl } from "@/lib/links/whatsapp";

describe("normalizeVePhone", () => {
  it.each([
    ["0414-123.45.67", "584141234567"],
    ["+58 414 1234567", "584141234567"],
    ["584241234567", "584241234567"],
    ["4121234567", "584121234567"],
    ["0274-2441234", "582742441234"],
    ["0058 416 1234567", "584161234567"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeVePhone(raw)).toBe(expected);
  });

  it.each(["", "123", "0414-123", "+1 305 555 1234 99", null, undefined])("rejects %s", (raw) => {
    expect(normalizeVePhone(raw)).toBeNull();
  });
});

describe("whatsapp", () => {
  it("fills the template for the suggested service", () => {
    const msg = whatsappMessage({
      businessName: "Café La Neblina",
      service: "video",
      senderName: "Pepe",
      municipality: "Libertador",
    });
    expect(msg).toContain("Café La Neblina");
    expect(msg).toContain("Pepe");
    expect(msg).toMatch(/reels/);
    expect(msg).not.toMatch(/\{\w+\}/);
  });

  it("uses the default template without a service", () => {
    expect(
      whatsappMessage({ businessName: "X", service: null, senderName: "Pepe", municipality: null }),
    ).toContain("Mérida");
  });

  it("builds a wa.me link with the encoded message, or null without phone", () => {
    expect(whatsappUrl("0414-1234567", "Hola ñ")).toBe(
      "https://wa.me/584141234567?text=Hola%20%C3%B1",
    );
    expect(whatsappUrl(null, "x")).toBeNull();
  });
});

describe("parseInstagramHandle", () => {
  it.each([
    ["https://www.instagram.com/cafe.laneblina/", "cafe.laneblina"],
    ["https://instagram.com/Cafe_LaNeblina?igsh=abc", "cafe_laneblina"],
    ["instagram.com/arepera", "arepera"],
    ["@trucha.y.lena", "trucha.y.lena"],
    ["burgerandes", "burgerandes"],
  ])("%s → %s", (input, expected) => {
    expect(parseInstagramHandle(input)).toBe(expected);
  });

  it.each([
    "https://www.instagram.com/p/Cxyz123/",
    "https://www.instagram.com/reel/abc/",
    "https://facebook.com/x",
    "no es un usuario!",
    "",
  ])("rejects %s", (input) => {
    expect(parseInstagramHandle(input)).toBeNull();
  });
});

describe("parseGoogleMapsLink", () => {
  it("reads the exact pin and the place name", () => {
    const r = parseGoogleMapsLink(
      "https://www.google.com/maps/place/Caf%C3%A9+La+Neblina/@8.5900,-71.1500,17z/data=!3m1!4b1!4m6!3m5!1sChIJabc123!8m2!3d8.5912!4d-71.1561",
    );
    expect(r).toMatchObject({
      name: "Café La Neblina",
      lat: 8.5912,
      lng: -71.1561,
      placeId: "ChIJabc123",
      isShortLink: false,
    });
  });

  it("falls back to the viewport and to q=lat,lng", () => {
    expect(parseGoogleMapsLink("https://www.google.com/maps/@8.59,-71.15,15z")).toMatchObject({
      lat: 8.59,
      lng: -71.15,
    });
    expect(parseGoogleMapsLink("https://maps.google.com/?q=8.6,-71.2")).toMatchObject({
      lat: 8.6,
      lng: -71.2,
    });
  });

  it("flags short links, which need to be expanded", () => {
    expect(parseGoogleMapsLink("https://maps.app.goo.gl/AbCdEf")).toMatchObject({
      isShortLink: true,
      lat: null,
    });
  });

  it("rejects other sites and garbage", () => {
    expect(parseGoogleMapsLink("https://example.com/maps/@8,-71")).toBeNull();
    expect(parseGoogleMapsLink("no es un link")).toBeNull();
  });
});
