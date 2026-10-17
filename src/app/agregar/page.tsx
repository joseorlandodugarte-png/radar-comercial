import { asc } from "drizzle-orm";

import { QuickAddForm } from "@/components/business/quick-add-form";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db/client";
import { getCategories, getStateBySlug, getStates } from "@/db/queries";
import { municipalities } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agregar negocio" };

export default async function AddBusinessPage() {
  const [cats, states, merida, munis] = await Promise.all([
    getCategories(),
    getStates(),
    getStateBySlug("merida"),
    db
      .select({ id: municipalities.id, name: municipalities.name, stateId: municipalities.stateId })
      .from(municipalities)
      .orderBy(asc(municipalities.name)),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Agregar negocio"
        description="Desde la calle: pega su link o usa tu ubicación, y listo."
      />
      <QuickAddForm
        categories={cats.roots.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          icon: r.icon,
          servesFood: r.servesFood,
          children: r.children.map((c) => ({ id: c.id, name: c.name })),
        }))}
        states={states.map((s) => ({ id: s.id, name: s.name }))}
        municipalities={munis}
        defaultStateId={merida?.id ?? states[0]?.id ?? 0}
      />
    </div>
  );
}
