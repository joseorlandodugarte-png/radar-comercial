"use client";

import { useQueryStates } from "nuqs";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locationParsers } from "@/lib/filters";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string; count: number };

export function LocationPicker({
  states,
  municipalities,
}: {
  states: Option[];
  municipalities: Option[];
}) {
  const [isPending, startTransition] = useTransition();
  const [loc, setLoc] = useQueryStates(locationParsers, {
    shallow: false,
    startTransition,
    scroll: false,
  });

  return (
    <div className={cn("flex flex-col gap-3", isPending && "opacity-70")}>
      <Select value={loc.estado} onValueChange={(v) => setLoc({ estado: v, municipio: null })}>
        <SelectTrigger className="h-11 w-full text-base font-medium sm:w-72" aria-label="Estado">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {states.map((s) => (
            <SelectItem key={s.slug} value={s.slug}>
              {s.name} {s.count ? `· ${s.count}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {municipalities.length > 0 && (
        <div
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
          aria-label="Municipio"
        >
          <MunicipalityChip active={!loc.municipio} onClick={() => setLoc({ municipio: null })}>
            Todo el estado
          </MunicipalityChip>
          {municipalities.map((m) => (
            <MunicipalityChip
              key={m.slug}
              active={loc.municipio === m.slug}
              onClick={() => setLoc({ municipio: m.slug })}
              muted={m.count === 0}
            >
              {m.name}
              {m.count > 0 && <span className="text-xs opacity-60">{m.count}</span>}
            </MunicipalityChip>
          ))}
        </div>
      )}
    </div>
  );
}

function MunicipalityChip({
  active,
  muted,
  onClick,
  children,
}: {
  active: boolean;
  muted?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent",
        muted && !active && "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
