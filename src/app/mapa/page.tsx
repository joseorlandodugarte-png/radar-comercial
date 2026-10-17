import type { SearchParams } from "nuqs/server";

import { FilterBar } from "@/components/business/filter-bar";
import { LocationPicker } from "@/components/dashboard/location-picker";
import { BusinessMapLazy } from "@/components/map/business-map-lazy";
import {
  getCategories,
  getMunicipalities,
  getMunicipalityBySlug,
  getStateBySlug,
  getStates,
  listBusinesses,
} from "@/db/queries";
import { filtersCache, locationCache } from "@/lib/filters.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mapa" };

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ estado, municipio }, f] = await Promise.all([
    locationCache.parse(searchParams),
    filtersCache.parse(searchParams),
  ]);
  const [states, state, cats] = await Promise.all([
    getStates(),
    getStateBySlug(estado),
    getCategories(),
  ]);
  const current = state ?? (await getStateBySlug("merida"));
  const municipalities = current ? await getMunicipalities(current.id) : [];
  const muni = current && municipio ? await getMunicipalityBySlug(current.id, municipio) : null;
  const { items, total } = current
    ? await listBusinesses({
        stateId: current.id,
        municipalityId: muni?.id,
        cat: f.cat,
        luz: f.luz,
        servicio: f.servicio,
        etapa: f.etapa,
        ig: f.ig,
        q: f.q,
      })
    : { items: [], total: 0 };

  const points = items
    .filter((b) => b.lat !== null && b.lng !== null)
    .map((b) => ({
      id: b.id,
      name: b.name,
      lat: b.lat!,
      lng: b.lng!,
      light: b.trafficLight,
      opportunity: b.opportunity,
      category: b.categoryName,
      sector: b.sector,
    }));
  const center = muni?.center ??
    municipalities.find((m) => m.slug === "libertador")?.center ?? { lat: 8.59, lng: -71.15 };

  return (
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">Mapa de negocios</h1>
      <LocationPicker
        states={states.map((s) => ({ slug: s.slug, name: s.name, count: s.businessCount }))}
        municipalities={municipalities.map((m) => ({
          slug: m.slug,
          name: m.name,
          count: m.businessCount,
        }))}
      />
      <FilterBar
        showViews={false}
        total={total}
        categories={cats.roots.map((r) => ({
          slug: r.slug,
          name: r.name,
          icon: r.icon,
          children: r.children.map((c) => ({ slug: c.slug, name: c.name })),
        }))}
      />
      <BusinessMapLazy
        points={points}
        center={center}
        zoom={muni ? 13 : 9}
        className="h-[62dvh] min-h-[420px]"
      />
      {total > points.length && (
        <p className="text-muted-foreground text-xs">
          {total - points.length} negocios no tienen ubicación y no aparecen en el mapa.
        </p>
      )}
    </div>
  );
}
