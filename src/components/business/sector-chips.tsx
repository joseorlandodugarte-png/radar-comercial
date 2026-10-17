"use client";

import { useQueryState } from "nuqs";
import { useTransition } from "react";

import { filterParsers } from "@/lib/filters";
import { cn } from "@/lib/utils";

export function SectorChips({ sectors }: { sectors: { sector: string | null; n: number }[] }) {
  const [, startTransition] = useTransition();
  const [sector, setSector] = useQueryState(
    "sector",
    filterParsers.sector.withOptions({ shallow: false, startTransition, scroll: false }),
  );
  if (sectors.length === 0) return null;
  return (
    <div
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
      aria-label="Sector"
    >
      {[{ sector: null, n: 0 }, ...sectors].map((s) => {
        const active = sector === s.sector;
        return (
          <button
            key={s.sector ?? "__all"}
            type="button"
            aria-pressed={active}
            onClick={() => setSector(s.sector)}
            className={cn(
              "h-8 shrink-0 rounded-lg px-3 text-sm whitespace-nowrap",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {s.sector ?? "Todos los sectores"}
            {s.n > 0 && <span className="ml-1 text-xs opacity-60">{s.n}</span>}
          </button>
        );
      })}
    </div>
  );
}
