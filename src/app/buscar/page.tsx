import { MapPinned, SearchX } from "lucide-react";
import Link from "next/link";

import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { globalSearch } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buscar" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await globalSearch(q);
  const empty = results.businesses.length === 0 && results.municipalities.length === 0;
  return (
    <>
      <PageHeader title={q ? `Resultados para “${q}”` : "Buscar"} />
      {q.trim().length < 2 ? (
        <p className="text-muted-foreground text-sm">
          Escribe al menos 2 letras: nombre, @instagram, sector o municipio.
        </p>
      ) : empty ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          description="¿Lo viste en la calle? Agrégalo en segundos."
          action={
            <Button asChild>
              <Link href="/agregar">Agregar negocio</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {results.municipalities.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 text-sm font-medium">Municipios</h2>
              <div className="flex flex-wrap gap-2">
                {results.municipalities.map((m) => (
                  <Link
                    key={`${m.stateSlug}-${m.slug}`}
                    href={`/explorar/${m.stateSlug}/${m.slug}`}
                    className="hover:bg-accent flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                  >
                    <MapPinned className="size-4" /> {m.name}, {m.stateName}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.businesses.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 text-sm font-medium">
                Negocios ({results.businesses.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {results.businesses.map((b) => (
                  <BusinessCard key={b.id} b={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
