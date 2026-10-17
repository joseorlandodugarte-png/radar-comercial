import { ChevronRight, MapPinned } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { getStates } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explorar" };

export default async function ExplorePage() {
  const states = await getStates();
  const active = states.filter((s) => s.businessCount > 0);
  const rest = states.filter((s) => s.businessCount === 0);
  return (
    <>
      <PageHeader
        title="Explorar"
        description="Elige un estado, luego un municipio y un sector."
        crumbs={[{ label: "Venezuela" }]}
      />
      <div className="flex flex-col gap-6">
        <StateGrid states={active} />
        {rest.length > 0 && (
          <section>
            <h2 className="text-muted-foreground mb-2 text-sm font-medium">Sin datos todavía</h2>
            <StateGrid states={rest} muted />
          </section>
        )}
      </div>
    </>
  );
}

function StateGrid({
  states,
  muted,
}: {
  states: Awaited<ReturnType<typeof getStates>>;
  muted?: boolean;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {states.map((s) => (
        <li key={s.id}>
          <Link
            href={`/explorar/${s.slug}`}
            className={`bg-card hover:bg-accent flex items-center gap-3 rounded-2xl border p-4 transition-colors ${muted ? "opacity-70" : ""}`}
          >
            <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-xl">
              <MapPinned className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{s.name}</span>
              <span className="text-muted-foreground block text-xs">
                {s.businessCount > 0 ? `${s.businessCount} negocios` : "Sin negocios cargados"}
                {s.municipalityCount > 0 && ` · ${s.municipalityCount} municipios`}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
