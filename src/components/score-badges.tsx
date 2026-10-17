import type { TrafficLight } from "@/db/schema";
import { TRAFFIC_LIGHT_CLASS, TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function TrafficDot({ light, className }: { light: TrafficLight; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        TRAFFIC_LIGHT_CLASS[light].dot,
        className,
      )}
    />
  );
}

export function TrafficLightBadge({
  light,
  className,
}: {
  light: TrafficLight;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TRAFFIC_LIGHT_CLASS[light].badge,
        className,
      )}
    >
      <TrafficDot light={light} className="size-2" />
      {TRAFFIC_LIGHT_LABEL[light]}
    </span>
  );
}

function colorForScore(score: number, invert: boolean) {
  const v = invert ? 100 - score : score;
  if (v < 40) return TRAFFIC_LIGHT_HEX.red;
  if (v < 70) return TRAFFIC_LIGHT_HEX.yellow;
  return TRAFFIC_LIGHT_HEX.green;
}

/**
 * Circular 0-100 gauge. `invert` colours high values red→green the other way
 * round (for Opportunity, high is "hot" so we use the primary colour instead).
 */
export function ScoreRing({
  value,
  label,
  size = 64,
  variant = "health",
}: {
  value: number | null;
  label: string;
  size?: number;
  variant?: "health" | "opportunity";
}) {
  const stroke = size >= 64 ? 6 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color =
    value === null
      ? "transparent"
      : variant === "opportunity"
        ? "var(--primary)"
        : colorForScore(value, false);
  return (
    <div
      className="flex flex-col items-center gap-1"
      aria-label={`${label}: ${value ?? "Sin dato"}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.18}
            strokeWidth={stroke}
            strokeDasharray="1.5 3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={value === null ? c : c * (1 - value / 100)}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-mono font-semibold tabular-nums",
            size >= 64 ? "text-lg" : "text-xs",
            value === null && "text-muted-foreground text-[10px] font-normal",
          )}
        >
          {value ?? "Sin dato"}
        </span>
      </div>
      <span className="text-muted-foreground text-center font-mono text-[10px] leading-tight tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

export function DemoBadge({ source }: { source: string }) {
  if (source !== "seed") return null;
  return (
    <span
      title="Negocio ficticio de demostración"
      className="border-muted-foreground/40 text-muted-foreground rounded border border-dashed px-1.5 text-[10px] font-semibold tracking-wide"
    >
      DEMO
    </span>
  );
}
