import { SquareKanban } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Kanban } from "@/components/pipeline/kanban";
import { Button } from "@/components/ui/button";
import { getPipeline } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const items = await getPipeline();
  const overdue = items.filter(
    (i) => i.nextActionAt && i.nextActionAt < new Date() && !["won", "lost"].includes(i.stage),
  ).length;
  const won = items.filter((i) => i.stage === "won").length;
  return (
    <>
      <PageHeader
        title="Pipeline"
        description={
          items.length
            ? `${items.length} prospectos · ${won} ganados${overdue ? ` · ${overdue} con acción vencida` : ""}`
            : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={SquareKanban}
          title="Tu pipeline está vacío"
          description="Abre la ficha de un negocio con buena oportunidad y elige una etapa, o escríbele por WhatsApp y registra el contacto."
          action={
            <Button asChild>
              <Link href="/">Ver oportunidades</Link>
            </Button>
          }
        />
      ) : (
        <Kanban items={items} />
      )}
    </>
  );
}
