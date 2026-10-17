import { ChevronRight, MapPinned } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getMunicipalities, getStateBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function StatePage({ params }: { params: Promise<{ estado: string }> }) {
  const { estado } = await params;
  const state = await getStateBySlug(estado);
  if (!state) notFound();
  const municipalities = await getMunicipalities(state.id);

  return (
    <>
      <PageHeader
        title={state.name}
        description="Municipios ordenados alfabéticamente. El número rojo son negocios que necesitan ayuda con sus redes."
        crumbs={[{ label: "Venezuela", href: "/explorar" }, { label: state.name }]}
      />
      {municipalities.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={`Aún no hay municipios cargados para ${state.name}`}
          description="Está en la hoja de ruta: después de Mérida vienen Táchira y Trujillo. Mientras, puedes importar negocios desde un CSV."
          action={
            <Button asChild variant="outline">
              <Link href="/mas/importar">Importar CSV o Excel</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {municipalities.map((m) => (
            <li key={m.id}>
              <Link
                href={`/explorar/${state.slug}/${m.slug}`}
                className="bg-card hover:bg-accent flex items-center gap-3 rounded-2xl border p-4 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {m.seat ? `${m.seat} · ` : ""}
                    {m.businessCount ? `${m.businessCount} negocios` : "Sin negocios"}
                  </span>
                </span>
                {m.redCount > 0 && (
                  <span
                    className="bg-light-red/12 text-light-red rounded-full px-2 py-0.5 text-xs font-semibold"
                    title="En rojo o sin redes"
                  >
                    {m.redCount}
                  </span>
                )}
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
