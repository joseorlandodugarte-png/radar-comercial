import Link from "next/link";

import { CategoryIcon, WhatsAppIcon } from "@/components/icons";
import { DemoBadge, TrafficDot } from "@/components/score-badges";
import { Button } from "@/components/ui/button";
import type { BusinessListItem } from "@/db/queries";
import { SERVICE_LABEL, TRAFFIC_LIGHT_LABEL } from "@/lib/labels";

import { whatsappLinkFor } from "./quick-actions";

/** Ranked, compact rows with a direct WhatsApp button: the "3 taps" path. */
export function OpportunityList({ items }: { items: BusinessListItem[] }) {
  return (
    <ol className="bg-card hud-frame divide-y rounded-xl border backdrop-blur-sm">
      {items.map((b, i) => {
        const wa = whatsappLinkFor(b);
        return (
          <li key={b.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <span className="text-muted-foreground w-5 shrink-0 text-center text-sm font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="bg-accent text-accent-foreground hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex">
              <CategoryIcon name={b.categoryIcon} className="size-4" />
            </span>
            <Link href={`/negocio/${b.id}`} className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="truncate">{b.name}</span>
                <DemoBadge source={b.source} />
              </span>
              <span className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                <TrafficDot light={b.trafficLight} className="size-2" />
                {TRAFFIC_LIGHT_LABEL[b.trafficLight]}
                {b.topService && <> · {SERVICE_LABEL[b.topService]}</>}
                {b.municipalityName && <> · {b.municipalityName}</>}
              </span>
            </Link>
            <span className="flex flex-col items-end">
              <span className="font-mono text-lg leading-none font-semibold tabular-nums">
                {b.opportunity}
              </span>
              <span className="text-muted-foreground text-[10px]">oportunidad</span>
            </span>
            {wa ? (
              <Button asChild size="icon" variant="whatsapp" className="shrink-0 rounded-full">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escribir a ${b.name} por WhatsApp`}
                >
                  <WhatsAppIcon className="size-5" />
                </a>
              </Button>
            ) : (
              <span className="size-10 shrink-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
