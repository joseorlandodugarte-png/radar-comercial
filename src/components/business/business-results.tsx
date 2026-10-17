import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { BusinessMapLazy } from "@/components/map/business-map-lazy";
import { Button } from "@/components/ui/button";
import type { BusinessListItem } from "@/db/queries";
import type { VIEWS } from "@/lib/filters";

import { BusinessCard } from "./business-card";
import { BusinessTable } from "./business-table";

export const PAGE_SIZE = 30;

export function BusinessResults({
  items,
  total,
  view,
  page,
  center,
  emptyAction,
  pageHref,
}: {
  items: BusinessListItem[];
  total: number;
  view: (typeof VIEWS)[number];
  page: number;
  center: { lat: number; lng: number };
  emptyAction?: React.ReactNode;
  pageHref: (page: number) => string;
}) {
  if (total === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No hay negocios con estos filtros"
        description="Prueba quitando un filtro o cambiando de sector. También puedes agregar uno nuevo."
        action={emptyAction}
      />
    );
  }

  if (view === "mapa") {
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
    return <BusinessMapLazy points={points} center={center} className="h-[65dvh] min-h-[420px]" />;
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  return (
    <div className="flex flex-col gap-4">
      {view === "tabla" ? (
        <BusinessTable items={items} />
      ) : (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="business-cards"
        >
          {items.map((b) => (
            <BusinessCard key={b.id} b={b} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
              Anterior
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            Página {page} de {pages}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(Math.min(pages, page + 1))} aria-disabled={page >= pages}>
              Siguiente
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
