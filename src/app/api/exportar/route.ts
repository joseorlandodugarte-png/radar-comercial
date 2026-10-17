import type { NextRequest } from "next/server";
import { createLoader } from "nuqs/server";

import { getMunicipalityBySlug, getStateBySlug, listBusinesses } from "@/db/queries";
import { filterParsers, locationParsers } from "@/lib/filters";
import { formatDate } from "@/lib/format";
import { toCsv } from "@/lib/import/columns";
import { toXlsx } from "@/lib/import/xlsx";
import { LEAD_STAGE_LABEL, SERVICE_LABEL, SOURCE_LABEL, TRAFFIC_LIGHT_LABEL } from "@/lib/labels";

const load = createLoader({ ...filterParsers, ...locationParsers });

export async function GET(req: NextRequest) {
  const f = load(req.nextUrl.searchParams);
  const format = req.nextUrl.searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const state = await getStateBySlug(f.estado);
  if (!state) return new Response("Estado no encontrado", { status: 404 });
  const muni = f.municipio ? await getMunicipalityBySlug(state.id, f.municipio) : null;

  const { items } = await listBusinesses({
    stateId: state.id,
    municipalityId: muni?.id,
    sector: f.sector,
    cat: f.cat,
    luz: f.luz,
    servicio: f.servicio,
    etapa: f.etapa,
    ig: f.ig,
    q: f.q,
    orden: f.orden,
  });

  // Same column names as the import, plus scores, so an export can be re-imported.
  const rows = items.map((b) => ({
    nombre: b.name,
    categoria: b.categorySlug,
    estado: b.stateName,
    municipio: b.municipalityName ?? "",
    sector: b.sector ?? "",
    direccion: b.address ?? "",
    latitud: b.lat ?? "",
    longitud: b.lng ?? "",
    telefono: b.phone ?? "",
    whatsapp: b.whatsapp ?? "",
    instagram: b.instagram ?? "",
    facebook: b.facebook ?? "",
    tiktok: b.tiktok ?? "",
    web: b.website ?? "",
    via_principal: b.onMainRoad === null ? "" : b.onMainRoad ? "sí" : "no",
    menu_digital: b.hasDigitalMenu === null ? "" : b.hasDigitalMenu ? "sí" : "no",
    notas: "",
    semaforo: TRAFFIC_LIGHT_LABEL[b.trafficLight],
    salud_digital: b.digitalHealth ?? "Sin dato",
    oportunidad: b.opportunity ?? "Sin dato",
    servicio_sugerido: b.topService ? SERVICE_LABEL[b.topService] : "",
    seguidores: b.followers ?? "Sin dato",
    rating_google: b.rating ?? "Sin dato",
    resenas_google: b.reviewCount ?? "Sin dato",
    etapa: b.stage ? LEAD_STAGE_LABEL[b.stage] : "",
    fuente: SOURCE_LABEL[b.source],
  }));

  const name = `radar-${state.slug}${muni ? `-${muni.slug}` : ""}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}.csv"`,
      },
    });
  }
  const buffer = await toXlsx(rows, `Negocios ${formatDate(new Date())}`.slice(0, 31));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
