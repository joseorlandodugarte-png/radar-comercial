"use client";

import { CalendarClock, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InteractionKind, LeadStage } from "@/db/schema";
import { formatDate, formatRelative } from "@/lib/format";
import { INTERACTION_LABEL, LEAD_STAGE_LABEL, LEAD_STAGES } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { addInteraction, setLeadStage, setNextAction } from "@/server/actions/leads";

type Interaction = { id: number; kind: InteractionKind; body: string | null; occurredAt: Date };

export function LeadPanel({
  businessId,
  stage,
  nextActionAt,
  nextActionNote,
  interactions,
}: {
  businessId: number;
  stage: LeadStage | null;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  interactions: Interaction[];
}) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<InteractionKind>("whatsapp");
  const [body, setBody] = useState("");
  const current = stage ?? "new";

  const moveTo = (s: LeadStage) =>
    startTransition(async () => {
      await setLeadStage(businessId, s);
      toast.success(`Movido a ${LEAD_STAGE_LABEL[s]}`);
    });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label className="mb-2 block text-sm">
          Etapa {pending && <Loader2 className="ml-1 inline size-3 animate-spin" />}
        </Label>
        <div
          className="-mx-1 flex flex-wrap gap-1.5 px-1"
          role="radiogroup"
          aria-label="Etapa del prospecto"
          data-testid="stage-buttons"
        >
          {LEAD_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={current === s}
              disabled={pending}
              onClick={() => moveTo(s)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-60",
                current === s
                  ? s === "won"
                    ? "border-light-green bg-light-green text-white"
                    : s === "lost"
                      ? "border-muted-foreground bg-muted-foreground text-background"
                      : "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent",
              )}
            >
              {LEAD_STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        {!stage && (
          <p className="text-muted-foreground mt-2 text-xs">
            Aún no está en tu pipeline: elegir una etapa lo agrega.
          </p>
        )}
      </div>

      <form
        className="bg-muted/50 grid gap-2 rounded-xl p-3"
        action={(fd) =>
          startTransition(async () => {
            await setNextAction(
              businessId,
              String(fd.get("date") ?? ""),
              String(fd.get("note") ?? ""),
            );
            toast.success("Próxima acción guardada");
          })
        }
      >
        <Label className="flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-4" /> Próxima acción
          {nextActionAt && (
            <span
              className={cn(
                "text-muted-foreground font-normal",
                nextActionAt < new Date() && "text-light-red",
              )}
            >
              · {formatDate(nextActionAt)} ({formatRelative(nextActionAt)})
            </span>
          )}
        </Label>
        <div className="flex gap-2">
          <Input
            type="date"
            name="date"
            defaultValue={nextActionAt ? toDateInput(nextActionAt) : ""}
            className="w-40 shrink-0"
            aria-label="Fecha"
          />
          <Input
            name="note"
            defaultValue={nextActionNote ?? ""}
            placeholder="Ej.: llevar propuesta impresa"
            aria-label="Qué hacer"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending}
          className="justify-self-end"
        >
          Guardar
        </Button>
      </form>

      <form
        className="grid gap-2"
        action={() =>
          startTransition(async () => {
            await addInteraction(businessId, kind, body);
            setBody("");
            toast.success("Contacto registrado");
          })
        }
      >
        <Label className="text-sm">Registrar contacto o nota</Label>
        <div className="flex gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as InteractionKind)}>
            <SelectTrigger className="w-44 shrink-0" aria-label="Tipo de contacto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(INTERACTION_LABEL) as InteractionKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {INTERACTION_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending} className="ml-auto">
            <Send /> Guardar
          </Button>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="¿Qué le dijiste o qué te respondió?"
          rows={2}
        />
      </form>

      <div>
        <h4 className="mb-2 text-sm font-medium">Historial de contactos</h4>
        {interactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay contactos registrados.</p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l pl-4">
            {interactions.map((i) => (
              <li key={i.id} className="relative">
                <span className="border-background bg-primary absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2" />
                <p className="text-muted-foreground text-xs">
                  {INTERACTION_LABEL[i.kind]} · {formatDate(i.occurredAt)}
                </p>
                {i.body && <p className="text-sm">{i.body}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function toDateInput(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(d);
}
