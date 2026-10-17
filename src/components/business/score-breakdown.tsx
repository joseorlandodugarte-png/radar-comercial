import { Info } from "lucide-react";

import { ScoreRing } from "@/components/score-badges";
import type { Factor, ScoreResult } from "@/lib/scoring";
import { formatDate, SIN_DATO } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Stored breakdowns are JSON: dates arrive as strings. */
type StoredFactor = Omit<Factor, "source"> & {
  source: { source: keyof typeof SOURCE_LABEL; capturedAt: string | Date } | null;
};

export function ScoreBreakdown({
  title,
  result,
  variant,
  description,
  hideKeys = [],
}: {
  title: string;
  result: ScoreResult | null;
  variant: "health" | "opportunity";
  description: string;
  hideKeys?: string[];
}) {
  const factors = ((result?.factors ?? []) as unknown as StoredFactor[]).filter(
    (f) => !hideKeys.some((k) => f.key.startsWith(k)),
  );
  return (
    <details className="group bg-card hud-frame rounded-xl border backdrop-blur-sm" open>
      <summary className="flex cursor-pointer list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <ScoreRing value={result?.score ?? null} label="" size={64} variant={variant} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
          {result?.note && (
            <p className="text-muted-foreground mt-1 flex items-start gap-1 text-xs">
              <Info className="mt-0.5 size-3 shrink-0" />
              {result.note}
            </p>
          )}
        </div>
        <span className="text-primary text-xs group-open:hidden">Ver desglose</span>
      </summary>
      <ul className="divide-y border-t">
        {factors.map((f) => (
          <li key={f.key} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3">
            <span
              className={cn(
                "text-sm font-medium",
                f.key.startsWith("strength.") && "text-muted-foreground pl-3 font-normal",
              )}
            >
              {f.label}
            </span>
            <span className="text-right text-sm font-semibold tabular-nums">
              {f.points === null ? (
                <span className="text-muted-foreground font-normal">{SIN_DATO}</span>
              ) : (
                `+${f.points}`
              )}
            </span>
            <div className="bg-muted col-span-2 h-1.5 overflow-hidden rounded-full">
              {f.value !== null && (
                <div
                  className={cn(
                    "h-full rounded-full",
                    variant === "opportunity" ? "bg-primary" : "bg-foreground/70",
                  )}
                  style={{ width: `${Math.round(f.value * 100)}%` }}
                />
              )}
            </div>
            <span className="text-muted-foreground col-span-2 text-xs">
              {f.detail}
              {f.source && (
                <>
                  {" · "}
                  {SOURCE_LABEL[f.source.source]}, {formatDate(f.source.capturedAt)}
                </>
              )}
              {!f.key.startsWith("strength.") && <> · peso {f.weight}</>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
