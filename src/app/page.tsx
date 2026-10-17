import { ArrowRight, MapPinned, Megaphone, SquareKanban, Store } from "lucide-react";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";

import { CategoryBars, LightDonut } from "@/components/dashboard/charts";
import { LocationPicker } from "@/components/dashboard/location-picker";
import { OpportunityList } from "@/components/business/opportunity-list";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboard,
  getMunicipalities,
  getMunicipalityBySlug,
  getStateBySlug,
  getStates,
} from "@/db/queries";
import { locationCache } from "@/lib/filters.server";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { estado, municipio } = await locationCache.parse(searchParams);
  const [states, state] = await Promise.all([getStates(), getStateBySlug(estado)]);
  const current = state ?? (await getStateBySlug("merida"));
  if (!current) {
    return (
      <EmptyState
        icon={Store}
        title="La base de datos está vacía"
        description="Ejecuta pnpm db:setup para cargar estados, municipios y negocios demo."
      />
    );
  }
  const municipalities = await getMunicipalities(current.id);
  const muni = municipio ? await getMunicipalityBySlug(current.id, municipio) : null;
  const data = await getDashboard(current.id, muni?.id ?? null);
  const place = muni ? `${muni.name}, ${current.name}` : current.name;
  const exploreHref = muni ? `/explorar/${current.slug}/${muni.slug}` : `/explorar/${current.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          ¿Dónde buscamos clientes hoy?
        </h1>
        <LocationPicker
          states={states.map((s) => ({ slug: s.slug, name: s.name, count: s.businessCount }))}
          municipalities={municipalities.map((m) => ({
            slug: m.slug,
            name: m.name,
            count: m.businessCount,
          }))}
        />
      </section>

      {data.total === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={`Aún no hay negocios en ${place}`}
          description="Agrega uno desde la calle, importa un CSV o ejecuta la ingesta de OpenStreetMap."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/agregar">Agregar negocio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/mas/importar">Importar CSV o Excel</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
            <Kpi label="Negocios" value={data.total} icon={Store} />
            <Kpi
              label="Necesitan ayuda"
              value={data.needHelp}
              hint="Rojo o sin redes"
              icon={Megaphone}
              accent
            />
            <Kpi label="Sin redes" value={data.byLight.no_social} icon={MapPinned} />
            <Kpi
              label="En el pipeline"
              value={data.activeLeads}
              icon={SquareKanban}
              href="/pipeline"
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Top {data.top.length} oportunidades</h2>
                <p className="text-muted-foreground text-sm">
                  {place} · les va bien, pero sus redes no ayudan
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={exploreHref}>
                  Ver todos <ArrowRight />
                </Link>
              </Button>
            </div>
            <OpportunityList items={data.top} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Semáforo de redes</CardTitle>
              </CardHeader>
              <CardContent>
                <LightDonut byLight={data.byLight} total={data.total} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBars data={data.byCategory} />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <div
      className={`hud-frame holo flex h-full flex-col gap-1 rounded-xl border p-4 backdrop-blur-sm ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
    >
      <span
        className={`flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase ${accent ? "opacity-75" : "text-muted-foreground"}`}
      >
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{value}</span>
      {hint && (
        <span className={`text-xs ${accent ? "opacity-75" : "text-muted-foreground"}`}>{hint}</span>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
