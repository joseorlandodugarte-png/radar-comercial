import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { ReviewActions } from "@/components/business/review-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getReviewQueue } from "@/db/queries";
import { formatDate } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revisión manual" };

export default async function ReviewPage() {
  const queue = await getReviewQueue();
  return (
    <>
      <PageHeader
        title="Revisión manual"
        description="Cuentas que la API oficial no pudo medir (personales, privadas o inexistentes). Revísalas a mano y carga los datos en su ficha."
        crumbs={[{ label: "Más", href: "/mas" }, { label: "Revisión manual" }]}
      />
      {queue.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nada pendiente"
          description="Cuando la ingesta de Instagram no pueda medir una cuenta, aparecerá aquí."
        />
      ) : (
        <ul className="bg-card divide-y rounded-2xl border">
          {queue.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/negocio/${r.businessId}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                {r.instagram && (
                  <span className="text-muted-foreground ml-2 text-sm">@{r.instagram}</span>
                )}
                <p className="text-muted-foreground text-sm">
                  {r.reason} · {SOURCE_LABEL[r.source]} · {formatDate(r.createdAt)}
                </p>
              </div>
              <ReviewActions id={r.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
