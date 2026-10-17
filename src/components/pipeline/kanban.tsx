"use client";

import { CalendarClock, GripVertical } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappLinkFor } from "@/components/business/quick-actions";
import { DemoBadge, TrafficDot } from "@/components/score-badges";
import type { PipelineItem } from "@/db/queries";
import type { LeadStage } from "@/db/schema";
import { formatRelative } from "@/lib/format";
import { LEAD_STAGE_LABEL, LEAD_STAGES, SERVICE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { setLeadStage } from "@/server/actions/leads";

const COLUMN_ACCENT: Partial<Record<LeadStage, string>> = {
  won: "border-t-light-green",
  lost: "border-t-muted-foreground",
};

export function Kanban({ items }: { items: PipelineItem[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(
    items,
    (state, { id, stage }: { id: number; stage: LeadStage }) =>
      state.map((i) => (i.businessId === id ? { ...i, stage } : i)),
  );

  const moveTo = (item: PipelineItem, stage: LeadStage) => {
    if (item.stage === stage) return;
    startTransition(async () => {
      move({ id: item.businessId, stage });
      try {
        await setLeadStage(item.businessId, stage);
        toast.success(`${item.name} → ${LEAD_STAGE_LABEL[stage]}`);
      } catch {
        toast.error("No se pudo mover. Intenta de nuevo.");
      }
    });
  };

  return (
    <>
      <div
        className="-mx-4 mb-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:hidden"
        aria-label="Ir a la etapa"
      >
        {LEAD_STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() =>
              document
                .getElementById(`col-${stage}`)
                ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
            }
            className="bg-background flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium"
          >
            {LEAD_STAGE_LABEL[stage]}
            <span className="text-muted-foreground text-xs tabular-nums">
              {optimistic.filter((i) => i.stage === stage).length}
            </span>
          </button>
        ))}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:snap-none">
        {LEAD_STAGES.map((stage) => {
          const column = optimistic.filter((i) => i.stage === stage);
          return (
            <section
              key={stage}
              id={`col-${stage}`}
              aria-label={LEAD_STAGE_LABEL[stage]}
              data-testid={`column-${stage}`}
              className={cn(
                "border-t-primary/60 bg-muted/40 flex w-[82vw] max-w-[300px] shrink-0 snap-center flex-col gap-2 rounded-xl border border-t-4 p-2 sm:w-72",
                COLUMN_ACCENT[stage],
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = Number(e.dataTransfer.getData("text/plain"));
                const item = optimistic.find((i) => i.businessId === id);
                if (item) moveTo(item, stage);
              }}
            >
              <header className="flex items-center justify-between px-2 pt-1">
                <h2 className="text-sm font-semibold">{LEAD_STAGE_LABEL[stage]}</h2>
                <span className="bg-background rounded-full px-2 text-xs font-medium tabular-nums">
                  {column.length}
                </span>
              </header>
              {column.length === 0 && (
                <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
                  {stage === "new"
                    ? "Agrega prospectos desde su ficha"
                    : "Arrastra o mueve tarjetas aquí"}
                </p>
              )}
              {column.map((item) => (
                <LeadCard key={item.businessId} item={item} onMove={(s) => moveTo(item, s)} />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

function LeadCard({ item, onMove }: { item: PipelineItem; onMove: (stage: LeadStage) => void }) {
  const overdue =
    item.nextActionAt !== null &&
    new Date(item.nextActionAt) < new Date() &&
    !["won", "lost"].includes(item.stage);
  const wa = whatsappLinkFor({ ...item, instagram: null, lat: null, lng: null });
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(item.businessId))}
      className="bg-card flex flex-col gap-2 rounded-xl border p-3 shadow-xs"
      data-testid="lead-card"
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className="text-muted-foreground mt-0.5 hidden size-4 shrink-0 cursor-grab md:block"
          aria-hidden
        />
        <CategoryIcon
          name={item.categoryIcon}
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
        />
        <Link
          href={`/negocio/${item.businessId}`}
          className="min-w-0 flex-1 text-sm leading-tight font-medium hover:underline"
        >
          {item.name} <DemoBadge source={item.source} />
          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs font-normal">
            <TrafficDot light={item.trafficLight} className="size-2" />
            {item.municipalityName ?? "Sin municipio"}
            {item.topService && <> · {SERVICE_LABEL[item.topService]}</>}
          </span>
        </Link>
        {item.opportunity !== null && (
          <span className="font-mono text-sm font-semibold tabular-nums">{item.opportunity}</span>
        )}
      </div>
      {item.nextActionAt && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            overdue ? "text-light-red font-medium" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3.5" />
          {overdue ? "Vencida: " : ""}
          {formatRelative(item.nextActionAt)}
          {item.nextActionNote && <span className="truncate"> · {item.nextActionNote}</span>}
        </p>
      )}
      <div className="flex items-center gap-2">
        <select
          aria-label={`Mover ${item.name} a otra etapa`}
          value={item.stage}
          onChange={(e) => onMove(e.target.value as LeadStage)}
          className="bg-background h-8 flex-1 rounded-md border px-2 text-xs"
        >
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {s === item.stage ? LEAD_STAGE_LABEL[s] : `Mover a ${LEAD_STAGE_LABEL[s]}`}
            </option>
          ))}
        </select>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp a ${item.name}`}
            className="bg-whatsapp flex size-8 items-center justify-center rounded-md text-white"
          >
            <WhatsAppIcon className="size-4" />
          </a>
        )}
      </div>
    </article>
  );
}
