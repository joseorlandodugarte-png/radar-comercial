"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { TrafficLightBadge } from "@/components/score-badges";
import type { TrafficLight } from "@/db/schema";
import { TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_LABEL } from "@/lib/labels";
import { loadMapStyle, MAP_PALETTE } from "@/lib/map/style";
import { cn } from "@/lib/utils";

export type MapPoint = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  light: TrafficLight;
  opportunity: number | null;
  category: string;
  sector: string | null;
};

const count = (light: string) => ["+", ["case", ["==", ["get", "light"], light], 1, 0]];

export function BusinessMap({
  points,
  center,
  zoom = 13,
  className,
}: {
  points: MapPoint[];
  center: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    (async () => {
      const [maplibre, { style, font }] = await Promise.all([
        import("maplibre-gl"),
        loadMapStyle(theme),
      ]);
      if (cancelled || !container.current) return;
      const palette = MAP_PALETTE[theme];
      map = new maplibre.Map({
        container: container.current,
        style,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(
        new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
        "top-right",
      );

      map.on("load", () => {
        if (!map) return;
        map.addSource("biz", {
          type: "geojson",
          data: toGeoJson(pointsRef.current),
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 15,
          clusterProperties: {
            red: count("red"),
            yellow: count("yellow"),
            green: count("green"),
            none: [
              "+",
              ["case", ["in", ["get", "light"], ["literal", ["no_social", "unknown"]]], 1, 0],
            ],
          },
        });
        // Cluster colour = the dominant traffic light inside it.
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "biz",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "case",
              [
                "all",
                [">=", ["get", "red"], ["get", "yellow"]],
                [">=", ["get", "red"], ["get", "green"]],
                [">=", ["get", "red"], ["get", "none"]],
              ],
              TRAFFIC_LIGHT_HEX.red,
              [
                "all",
                [">=", ["get", "yellow"], ["get", "green"]],
                [">=", ["get", "yellow"], ["get", "none"]],
              ],
              TRAFFIC_LIGHT_HEX.yellow,
              [">=", ["get", "green"], ["get", "none"]],
              TRAFFIC_LIGHT_HEX.green,
              TRAFFIC_LIGHT_HEX.no_social,
            ],
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
            "circle-stroke-width": 3,
            "circle-stroke-color": palette.markerStroke,
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "biz",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13,
            "text-font": font,
          },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "points",
          type: "circle",
          source: "biz",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "light"],
              "red",
              TRAFFIC_LIGHT_HEX.red,
              "yellow",
              TRAFFIC_LIGHT_HEX.yellow,
              "green",
              TRAFFIC_LIGHT_HEX.green,
              "no_social",
              TRAFFIC_LIGHT_HEX.no_social,
              TRAFFIC_LIGHT_HEX.unknown,
            ],
            "circle-radius": 9,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": palette.markerStroke,
          },
        });

        map.on("click", "clusters", async (e) => {
          const feature = e.features?.[0];
          const id = feature?.properties?.cluster_id as number | undefined;
          if (!map || !feature || id === undefined || feature.geometry.type !== "Point") return;
          const z = await (map.getSource("biz") as GeoJSONSource).getClusterExpansionZoom(id);
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: z });
        });
        map.on("click", "points", (e) => {
          const id = Number(e.features?.[0]?.properties?.id);
          setSelected(pointsRef.current.find((p) => p.id === id) ?? null);
        });
        for (const layer of ["clusters", "points"]) {
          map.on("mouseenter", layer, () => map && (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => map && (map.getCanvas().style.cursor = ""));
        }
        fitTo(map, pointsRef.current);
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // The map is rebuilt only when the theme changes; data updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("biz") as GeoJSONSource | undefined;
    if (map && source) {
      source.setData(toGeoJson(points));
      fitTo(map, points);
    }
  }, [points]);

  return (
    <div className={cn("hud-frame relative overflow-hidden rounded-xl border", className)}>
      <div ref={container} className="h-full w-full" data-testid="business-map" />
      <Legend />
      {points.length === 0 && (
        <div className="bg-background/95 absolute inset-x-4 top-4 rounded-xl p-3 text-center text-sm shadow">
          No hay negocios con ubicación para estos filtros.
        </div>
      )}
      {selected && (
        <div className="bg-background absolute inset-x-3 bottom-3 rounded-xl border p-4 shadow-lg md:right-auto md:w-80">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-accent absolute top-2 right-2 rounded-md p-1"
          >
            <X className="size-4" />
          </button>
          <p className="pr-6 font-semibold">{selected.name}</p>
          <p className="text-muted-foreground text-xs">
            {selected.category}
            {selected.sector ? ` · ${selected.sector}` : ""}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <TrafficLightBadge light={selected.light} />
            <span className="text-sm">
              Oportunidad <strong>{selected.opportunity ?? "Sin dato"}</strong>
            </span>
          </div>
          <Link
            href={`/negocio/${selected.id}`}
            className="bg-primary text-primary-foreground mt-3 block rounded-lg py-2 text-center text-sm font-medium"
          >
            Ver ficha
          </Link>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-background/85 absolute top-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border px-2.5 py-1.5 font-mono text-[10.5px] tracking-wide uppercase backdrop-blur">
      {(["red", "yellow", "green", "no_social"] as const).map((l) => (
        <span key={l} className="flex items-center gap-1">
          <span className="size-2.5 rounded-full" style={{ background: TRAFFIC_LIGHT_HEX[l] }} />
          {TRAFFIC_LIGHT_LABEL[l]}
        </span>
      ))}
    </div>
  );
}

function toGeoJson(points: MapPoint[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, light: p.light },
    })),
  };
}

function fitTo(map: MapLibreMap, points: MapPoint[]) {
  if (points.length < 2) {
    const p = points[0];
    if (p) map.easeTo({ center: [p.lng, p.lat], zoom: 15 });
    return;
  }
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: 48, maxZoom: 15, duration: 0 },
  );
}
