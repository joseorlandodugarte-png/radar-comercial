import { MapPin, Users } from "lucide-react";
import Link from "next/link";

import { CategoryIcon, WhatsAppIcon } from "@/components/icons";
import { DemoBadge, ScoreRing, TrafficLightBadge } from "@/components/score-badges";
import { Button } from "@/components/ui/button";
import type { BusinessListItem } from "@/db/queries";
import { formatCompact, formatRating } from "@/lib/format";
import { LEAD_STAGE_LABEL, SERVICE_LABEL } from "@/lib/labels";

import { whatsappLinkFor } from "./quick-actions";

export function BusinessCard({ b }: { b: BusinessListItem }) {
  const wa = whatsappLinkFor(b);
  return (
    <article className="group bg-card relative flex min-w-0 flex-col gap-3 rounded-2xl border p-4 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
          <CategoryIcon name={b.categoryIcon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 leading-tight font-semibold">
            <Link
              href={`/negocio/${b.id}`}
              className="truncate after:absolute after:inset-0 after:content-['']"
            >
              {b.name}
            </Link>
            <DemoBadge source={b.source} />
          </h3>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
            <span>{b.categoryName}</span>
            <span aria-hidden>·</span>
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {[b.sector, b.municipalityName].filter(Boolean).join(", ") || "Sin dato"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TrafficLightBadge light={b.trafficLight} />
            {b.topService && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {SERVICE_LABEL[b.topService]}
              </span>
            )}
            {b.stage && (
              <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
                {LEAD_STAGE_LABEL[b.stage]}
              </span>
            )}
          </div>
        </div>
        <ScoreRing value={b.opportunity} label="Oportunidad" size={48} variant="opportunity" />
      </div>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Seguidores">
            <Users className="size-3.5" />
            {formatCompact(b.followers)}
          </span>
          <span title="Google">{formatRating(b.rating)}</span>
          <span>Salud: {b.digitalHealth ?? "Sin dato"}</span>
        </span>
        {wa && (
          <Button asChild size="sm" variant="whatsapp" className="relative z-10">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Escribir a ${b.name} por WhatsApp`}
            >
              <WhatsAppIcon className="size-4" /> Escribir
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
