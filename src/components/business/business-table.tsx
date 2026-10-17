import Link from "next/link";

import { CategoryIcon } from "@/components/icons";
import { DemoBadge, TrafficLightBadge } from "@/components/score-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BusinessListItem } from "@/db/queries";
import { formatCompact, formatRating, SIN_DATO } from "@/lib/format";
import { LEAD_STAGE_LABEL, SERVICE_LABEL } from "@/lib/labels";

export function BusinessTable({ items }: { items: BusinessListItem[] }) {
  return (
    <div className="bg-card hud-frame rounded-xl border backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Negocio</TableHead>
            <TableHead>Semáforo</TableHead>
            <TableHead className="text-right">Oportunidad</TableHead>
            <TableHead className="text-right">Salud</TableHead>
            <TableHead className="text-right">Seguidores</TableHead>
            <TableHead>Google</TableHead>
            <TableHead>Servicio sugerido</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="pr-4">Etapa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="pl-4">
                <Link
                  href={`/negocio/${b.id}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  <CategoryIcon name={b.categoryIcon} className="text-muted-foreground size-4" />
                  {b.name}
                  <DemoBadge source={b.source} />
                </Link>
              </TableCell>
              <TableCell>
                <TrafficLightBadge light={b.trafficLight} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {b.opportunity ?? SIN_DATO}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {b.digitalHealth ?? SIN_DATO}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCompact(b.followers)}
              </TableCell>
              <TableCell>{formatRating(b.rating)}</TableCell>
              <TableCell>{b.topService ? SERVICE_LABEL[b.topService] : "—"}</TableCell>
              <TableCell>{b.sector ?? SIN_DATO}</TableCell>
              <TableCell className="pr-4">{b.stage ? LEAD_STAGE_LABEL[b.stage] : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
