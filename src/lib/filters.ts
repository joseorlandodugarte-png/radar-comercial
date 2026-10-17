import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

import { LEAD_STAGES, SERVICES, TRAFFIC_LIGHTS } from "@/lib/labels";

export const SORTS = ["oportunidad", "salud", "nombre", "seguidores"] as const;
export const VIEWS = ["tarjetas", "tabla", "mapa"] as const;
export const STAGE_FILTERS = [...LEAD_STAGES, "sin"] as const;

/** Explorer filters, all stored in the URL so a filtered list can be shared or bookmarked. */
export const filterParsers = {
  sector: parseAsString,
  cat: parseAsString,
  luz: parseAsArrayOf(parseAsStringLiteral(TRAFFIC_LIGHTS)).withDefault([]),
  servicio: parseAsStringLiteral(SERVICES),
  etapa: parseAsStringLiteral(STAGE_FILTERS),
  ig: parseAsStringLiteral(["con", "sin"] as const),
  orden: parseAsStringLiteral(SORTS).withDefault("oportunidad"),
  vista: parseAsStringLiteral(VIEWS).withDefault("tarjetas"),
  q: parseAsString,
  pagina: parseAsInteger.withDefault(1),
};

/** Dashboard location selector. */
export const locationParsers = {
  estado: parseAsString.withDefault("merida"),
  municipio: parseAsString,
};
