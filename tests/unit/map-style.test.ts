import type { StyleSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";

import { MAP_PALETTE, themeStyle } from "@/lib/map/style";

const base: StyleSpecification = {
  version: 8,
  sources: { v: { type: "vector", url: "https://example.org/tiles.json" } },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fff" } },
    {
      id: "water",
      type: "fill",
      source: "v",
      "source-layer": "water",
      paint: { "fill-color": "#00f" },
    },
    {
      id: "highway_major_inner",
      type: "line",
      source: "v",
      "source-layer": "transportation",
      paint: { "line-color": "#fff", "line-width": 3 },
    },
    {
      id: "highway_major_casing",
      type: "line",
      source: "v",
      "source-layer": "transportation",
      paint: { "line-color": "#ccc" },
    },
    { id: "place_label", type: "symbol", source: "v", "source-layer": "place" },
    {
      id: "poi",
      type: "circle",
      source: "v",
      "source-layer": "poi",
      paint: { "circle-color": "#f00" },
    },
  ],
};

describe("themeStyle", () => {
  const light = MAP_PALETTE.light;
  const layers = themeStyle(base, "light").layers as Array<{
    id: string;
    paint?: Record<string, unknown>;
  }>;
  const paint = (id: string) => layers.find((l) => l.id === id)?.paint ?? {};

  it("recolours background, water, roads and labels with the cream palette", () => {
    expect(paint("background")["background-color"]).toBe(light.background);
    expect(paint("water")["fill-color"]).toBe(light.water);
    expect(paint("highway_major_inner")["line-color"]).toBe(light.majorRoad);
    expect(paint("highway_major_casing")["line-color"]).toBe(light.casing);
    expect(paint("place_label")["text-color"]).toBe(light.text);
  });

  it("keeps widths and leaves unknown layers alone", () => {
    expect(paint("highway_major_inner")["line-width"]).toBe(3);
    expect(paint("poi")["circle-color"]).toBe("#f00");
  });

  it("uses the dark palette in dark mode", () => {
    const dark = themeStyle(base, "dark").layers[0] as { paint: Record<string, unknown> };
    expect(dark.paint["background-color"]).toBe(MAP_PALETTE.dark.background);
  });
});
