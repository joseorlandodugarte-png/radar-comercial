import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * Base map. OpenFreeMap serves OpenStreetMap as vector tiles, rebuilt from the
 * planet file every week, free and without an API key. We recolour its
 * "positron" style to match the app; if it can't be reached we fall back to the
 * standard OSM raster tiles.
 */
export const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export type MapPalette = {
  background: string;
  water: string;
  green: string;
  building: string;
  minorRoad: string;
  majorRoad: string;
  casing: string;
  boundary: string;
  text: string;
  halo: string;
  /** Ring around markers and clusters. */
  markerStroke: string;
};

export const MAP_PALETTE: Record<"light" | "dark", MapPalette> = {
  light: {
    background: "#f3ecdd",
    water: "#d9d3c4",
    green: "#e7e1cc",
    building: "#e4dccb",
    minorRoad: "#fbf6ea",
    majorRoad: "#2a2620",
    casing: "#d6cdb9",
    boundary: "#1a1713",
    text: "#1a1713",
    halo: "#f3ecdd",
    markerStroke: "#f8f3e7",
  },
  dark: {
    background: "#181512",
    water: "#0e0c0a",
    green: "#1d1a16",
    building: "#231f1a",
    minorRoad: "#2b2722",
    majorRoad: "#e8dcc4",
    casing: "#14110e",
    boundary: "#e8dcc4",
    text: "#e8dcc4",
    halo: "#181512",
    markerStroke: "#181512",
  },
};

type Role = keyof Omit<MapPalette, "markerStroke" | "text" | "halo">;

function roleOf(layer: LayerSpecification): Role | null {
  if (layer.type === "background") return "background";
  const id = layer.id.toLowerCase();
  const sourceLayer = ("source-layer" in layer ? layer["source-layer"] : "") ?? "";
  if (sourceLayer.startsWith("water") || id.includes("water")) return "water";
  if (sourceLayer === "building" || id.includes("building")) return "building";
  if (["park", "landcover", "landuse"].includes(sourceLayer)) return "green";
  if (sourceLayer === "boundary" || id.includes("boundary")) return "boundary";
  if (sourceLayer === "transportation" || /road|highway|street|path|bridge|tunnel|rail/.test(id)) {
    if (id.includes("casing")) return "casing";
    if (/motorway|trunk|primary|major/.test(id)) return "majorRoad";
    return "minorRoad";
  }
  return null;
}

/** Recolours a vector style in place to the app palette. Widths and filters stay as they are. */
export function themeStyle(style: StyleSpecification, theme: "light" | "dark"): StyleSpecification {
  const p = MAP_PALETTE[theme];
  const layers = style.layers.map((layer) => {
    const paint = { ...(("paint" in layer ? layer.paint : undefined) ?? {}) } as Record<
      string,
      unknown
    >;
    if (layer.type === "symbol") {
      paint["text-color"] = p.text;
      paint["text-halo-color"] = p.halo;
      return { ...layer, paint } as LayerSpecification;
    }
    const role = roleOf(layer);
    if (!role) return layer;
    if (layer.type === "background") paint["background-color"] = p.background;
    if (layer.type === "fill") {
      paint["fill-color"] = p[role];
      delete paint["fill-pattern"];
    }
    if (layer.type === "fill-extrusion") paint["fill-extrusion-color"] = p[role];
    if (layer.type === "line") {
      paint["line-color"] = p[role];
      if (role === "majorRoad") paint["line-opacity"] = 0.55;
      if (role === "boundary") paint["line-opacity"] = 0.45;
    }
    return { ...layer, paint } as LayerSpecification;
  });
  return { ...style, layers };
}

/** Fetches the vector style; returns the raster fallback when offline or blocked. */
export async function loadMapStyle(
  theme: "light" | "dark",
): Promise<{ style: StyleSpecification | string; font: string[] }> {
  try {
    const res = await fetch(VECTOR_STYLE_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    const style = (await res.json()) as StyleSpecification;
    return { style: themeStyle(style, theme), font: ["Noto Sans Bold"] };
  } catch {
    return { style: FALLBACK_STYLE, font: ["Open Sans Semibold"] };
  }
}
