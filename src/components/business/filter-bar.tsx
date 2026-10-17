"use client";

import { LayoutGrid, Map as MapIcon, SlidersHorizontal, Table2, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useTransition } from "react";

import { CategoryIcon } from "@/components/icons";
import { TrafficDot } from "@/components/score-badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { filterParsers, SORTS, STAGE_FILTERS } from "@/lib/filters";
import {
  LEAD_STAGE_LABEL,
  SERVICE_LABEL,
  SERVICES,
  TRAFFIC_LIGHT_LABEL,
  TRAFFIC_LIGHTS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

export type CategoryOption = {
  slug: string;
  name: string;
  icon: string;
  children: { slug: string; name: string }[];
};

const SORT_LABEL: Record<(typeof SORTS)[number], string> = {
  oportunidad: "Mayor oportunidad",
  salud: "Peor salud digital",
  seguidores: "Más seguidores",
  nombre: "Nombre (A-Z)",
};

const ALL = "__all";

function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  categories,
  total,
  showViews = true,
}: {
  categories: CategoryOption[];
  total: number;
  showViews?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useQueryStates(filterParsers, {
    shallow: false,
    startTransition,
    scroll: false,
  });

  const advancedCount =
    [f.servicio, f.etapa, f.ig].filter(Boolean).length + (f.orden !== "oportunidad" ? 1 : 0);
  const anyFilter = f.luz.length > 0 || f.cat || advancedCount > 0 || f.q;
  const activeRoot = categories.find(
    (c) => c.slug === f.cat || c.children.some((ch) => ch.slug === f.cat),
  );

  const toggleLight = (l: (typeof TRAFFIC_LIGHTS)[number]) =>
    setF({ luz: f.luz.includes(l) ? f.luz.filter((x) => x !== l) : [...f.luz, l], pagina: null });

  return (
    <div className={cn("flex flex-col gap-3", isPending && "opacity-70 transition-opacity")}>
      <div className="flex items-center justify-between gap-2">
        {showViews ? (
          <div className="bg-muted inline-flex rounded-lg p-1" role="tablist" aria-label="Vista">
            {(
              [
                ["tarjetas", "Tarjetas", LayoutGrid],
                ["tabla", "Tabla", Table2],
                ["mapa", "Mapa", MapIcon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={f.vista === value}
                onClick={() => setF({ vista: value })}
                className={cn(
                  "text-muted-foreground flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
                  f.vista === value && "bg-background text-foreground shadow-sm",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {total} {total === 1 ? "negocio" : "negocios"}
          </span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal /> Filtros{advancedCount ? ` (${advancedCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="mx-auto max-w-lg md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:rounded-2xl md:border"
            >
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>Se guardan en el enlace para compartirlos.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-6">
                <Field label="Servicio sugerido">
                  <Select
                    value={f.servicio ?? ALL}
                    onValueChange={(v) =>
                      setF({ servicio: v === ALL ? null : (v as (typeof SERVICES)[number]) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {SERVICES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SERVICE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Etapa en el pipeline">
                  <Select
                    value={f.etapa ?? ALL}
                    onValueChange={(v) =>
                      setF({ etapa: v === ALL ? null : (v as (typeof STAGE_FILTERS)[number]) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      <SelectItem value="sin">Sin contactar</SelectItem>
                      {STAGE_FILTERS.filter((s) => s !== "sin").map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STAGE_LABEL[s as keyof typeof LEAD_STAGE_LABEL]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Instagram">
                  <Select
                    value={f.ig ?? ALL}
                    onValueChange={(v) => setF({ ig: v === ALL ? null : (v as "con" | "sin") })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Con o sin Instagram</SelectItem>
                      <SelectItem value="con">Con Instagram</SelectItem>
                      <SelectItem value="sin">Sin Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ordenar por">
                  <Select
                    value={f.orden}
                    onValueChange={(v) => setF({ orden: v as (typeof SORTS)[number] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SORT_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {activeRoot && activeRoot.children.length > 0 && (
                  <Field label={`Tipo de ${activeRoot.name.toLowerCase()}`}>
                    <Select
                      value={f.cat ?? activeRoot.slug}
                      onValueChange={(v) => setF({ cat: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={activeRoot.slug}>Todos</SelectItem>
                        {activeRoot.children.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        aria-label="Semáforo"
      >
        {TRAFFIC_LIGHTS.map((l) => (
          <Chip
            key={l}
            active={f.luz.includes(l)}
            onClick={() => toggleLight(l)}
            testId={`light-${l}`}
          >
            <TrafficDot light={l} />
            {TRAFFIC_LIGHT_LABEL[l]}
          </Chip>
        ))}
      </div>
      <div
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        aria-label="Categorías"
      >
        {categories.map((c) => {
          const active = activeRoot?.slug === c.slug;
          return (
            <Chip
              key={c.slug}
              active={active}
              onClick={() => setF({ cat: active ? null : c.slug, pagina: null })}
              testId={`cat-${c.slug}`}
            >
              <CategoryIcon name={c.icon} className="size-4" />
              {c.name}
            </Chip>
          );
        })}
        {f.cat && activeRoot && f.cat !== activeRoot.slug && (
          <Chip active onClick={() => setF({ cat: activeRoot.slug })} testId={`cat-${f.cat}`}>
            {activeRoot.children.find((c) => c.slug === f.cat)?.name} <X className="size-3.5" />
          </Chip>
        )}
      </div>
      {anyFilter && (
        <button
          type="button"
          onClick={() =>
            setF({
              luz: null,
              cat: null,
              servicio: null,
              etapa: null,
              ig: null,
              orden: null,
              q: null,
              pagina: null,
            })
          }
          className="text-primary self-start text-sm underline-offset-4 hover:underline"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
