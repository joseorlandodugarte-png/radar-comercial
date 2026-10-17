import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSerializer, type SearchParams } from "nuqs/server";

import { BusinessResults, PAGE_SIZE } from "@/components/business/business-results";
import { FilterBar } from "@/components/business/filter-bar";
import { SectorChips } from "@/components/business/sector-chips";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  getCategories,
  getMunicipalityBySlug,
  getSectors,
  getStateBySlug,
  listBusinesses,
} from "@/db/queries";
import { filterParsers } from "@/lib/filters";
import { filtersCache } from "@/lib/filters.server";

export const dynamic = "force-dynamic";

const serialize = createSerializer(filterParsers);

export default async function MunicipalityPage({
  params,
  searchParams,
}: {
  params: Promise<{ estado: string; municipio: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { estado, municipio } = await params;
  const f = await filtersCache.parse(searchParams);
  const state = await getStateBySlug(estado);
  if (!state) notFound();
  const muni = await getMunicipalityBySlug(state.id, municipio);
  if (!muni) notFound();

  const isMap = f.vista === "mapa";
  const [{ items, total }, sectors, cats] = await Promise.all([
    listBusinesses({
      stateId: state.id,
      municipalityId: muni.id,
      sector: f.sector,
      cat: f.cat,
      luz: f.luz,
      servicio: f.servicio,
      etapa: f.etapa,
      ig: f.ig,
      q: f.q,
      orden: f.orden,
      limit: isMap ? undefined : PAGE_SIZE,
      offset: isMap ? 0 : (f.pagina - 1) * PAGE_SIZE,
    }),
    getSectors(muni.id),
    getCategories(),
  ]);

  const base = `/explorar/${state.slug}/${muni.slug}`;
  const exportQuery = new URLSearchParams({ estado: state.slug, municipio: muni.slug });
  const current = serialize(f);
  if (current) for (const [k, v] of new URLSearchParams(current)) exportQuery.set(k, v);

  return (
    <>
      <PageHeader
        title={f.sector ? f.sector : muni.name}
        description={
          f.sector ? `Sector de ${muni.name}` : muni.seat ? `Capital: ${muni.seat}` : undefined
        }
        crumbs={[
          { label: "Venezuela", href: "/explorar" },
          { label: state.name, href: `/explorar/${state.slug}` },
          { label: muni.name, href: f.sector ? base : undefined },
          ...(f.sector ? [{ label: f.sector }] : []),
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/exportar?${exportQuery.toString()}&formato=xlsx`}>
              <Download /> Exportar
            </a>
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <SectorChips sectors={sectors} />
        <FilterBar
          total={total}
          categories={cats.roots.map((r) => ({
            slug: r.slug,
            name: r.name,
            icon: r.icon,
            children: r.children.map((c) => ({ slug: c.slug, name: c.name })),
          }))}
        />
        <BusinessResults
          items={items}
          total={total}
          view={f.vista}
          page={f.pagina}
          center={muni.center ?? { lat: 8.59, lng: -71.15 }}
          pageHref={(p) => `${base}${serialize({ ...f, pagina: p === 1 ? null : p })}`}
          emptyAction={
            <Button asChild>
              <Link href="/agregar">
                <Plus /> Agregar negocio
              </Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
