"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { businesses, categories, municipalities, states } from "@/db/schema";
import { parseCsv, validateRecords, type ImportRow } from "@/lib/import/columns";
import { findDuplicate } from "@/lib/import/dedupe";
import { parseXlsx } from "@/lib/import/xlsx";
import { slugify } from "@/lib/format/slug";
import { findExistingDuplicate } from "@/server/dedupe";
import { municipalityForPoint } from "@/server/geo";
import { recomputeScores } from "@/server/scoring-service";

const MAX_ROWS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

export type PreviewRow = {
  line: number;
  ok: boolean;
  errors: string[];
  data: ImportRow | null;
  resolved: { categoryId: number; stateId: number; municipalityId: number | null } | null;
  duplicate: { id: number | null; name: string; reason: string } | null;
};

export type PreviewResult = { ok: true; rows: PreviewRow[] } | { ok: false; message: string };

async function lookups() {
  const [cats, sts, munis] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories),
    db.select({ id: states.id, slug: states.slug }).from(states),
    db
      .select({ id: municipalities.id, slug: municipalities.slug, stateId: municipalities.stateId })
      .from(municipalities),
  ]);
  return {
    category: (v: string) =>
      cats.find((c) => c.slug === slugify(v) || slugify(c.name) === slugify(v))?.id ?? null,
    state: (v: string | null) => sts.find((s) => s.slug === slugify(v ?? "merida"))?.id ?? null,
    municipality: (stateId: number, v: string | null) =>
      v ? (munis.find((m) => m.stateId === stateId && m.slug === slugify(v))?.id ?? null) : null,
  };
}

export async function previewImport(formData: FormData): Promise<PreviewResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Elige un archivo CSV o Excel" };
  if (file.size > MAX_BYTES) return { ok: false, message: "El archivo pesa más de 5 MB" };

  const name = file.name.toLowerCase();
  let records: Record<string, string>[];
  try {
    if (name.endsWith(".xlsx")) records = await parseXlsx(await file.arrayBuffer());
    else if (name.endsWith(".csv") || name.endsWith(".txt")) records = parseCsv(await file.text());
    else return { ok: false, message: "Formato no soportado: usa .csv o .xlsx" };
  } catch {
    return { ok: false, message: "No se pudo leer el archivo. ¿Está dañado?" };
  }
  if (records.length === 0) return { ok: false, message: "El archivo no tiene filas" };
  if (records.length > MAX_ROWS)
    return { ok: false, message: `Máximo ${MAX_ROWS} filas por importación` };

  const find = await lookups();
  const seen: Array<{ id: number; line: number } & Parameters<typeof findDuplicate>[0]> = [];
  const rows: PreviewRow[] = [];

  for (const r of validateRecords(records)) {
    if (!r.ok) {
      rows.push({
        line: r.line,
        ok: false,
        errors: r.errors,
        data: null,
        resolved: null,
        duplicate: null,
      });
      continue;
    }
    const d = r.data;
    const errors: string[] = [];
    const categoryId = find.category(d.categoria);
    const stateId = find.state(d.estado);
    if (!categoryId) errors.push(`Categoría desconocida: ${d.categoria}`);
    if (!stateId) errors.push(`Estado desconocido: ${d.estado}`);
    let municipalityId = stateId ? find.municipality(stateId, d.municipio) : null;
    if (d.municipio && stateId && !municipalityId)
      errors.push(`Municipio desconocido: ${d.municipio}`);
    if (!categoryId || !stateId || errors.length) {
      rows.push({ line: r.line, ok: false, errors, data: d, resolved: null, duplicate: null });
      continue;
    }
    const location =
      d.latitud !== null && d.longitud !== null ? { lat: d.latitud, lng: d.longitud } : null;
    if (!municipalityId && location)
      municipalityId = await municipalityForPoint(stateId, location.lng, location.lat);

    const candidate = {
      name: d.nombre,
      instagram: d.instagram,
      phone: d.telefono,
      whatsapp: d.whatsapp,
      location,
    };
    const inFile = findDuplicate(candidate, seen);
    const inDb = inFile ? null : await findExistingDuplicate({ ...candidate, stateId });
    const duplicate = inFile
      ? {
          id: null,
          name: d.nombre,
          reason: `Repetido en el archivo (línea ${seen.find((s) => s.id === inFile.id)?.line})`,
        }
      : inDb
        ? { id: inDb.id, name: inDb.name, reason: inDb.reason }
        : null;
    seen.push({ id: -r.line, line: r.line, ...candidate });
    rows.push({
      line: r.line,
      ok: true,
      errors: [],
      data: d,
      resolved: { categoryId, stateId, municipalityId },
      duplicate,
    });
  }
  return { ok: true, rows };
}

const nullableText = z.string().max(2000).nullable();
/** Shape of an already-validated row coming back from the preview. */
const parsedRowSchema = z.object({
  nombre: z.string().min(2),
  categoria: z.string(),
  estado: nullableText,
  municipio: nullableText,
  sector: nullableText,
  direccion: nullableText,
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
  telefono: nullableText,
  whatsapp: nullableText,
  instagram: z
    .string()
    .regex(/^[a-z0-9._]{1,30}$/)
    .nullable(),
  facebook: nullableText,
  tiktok: nullableText,
  web: nullableText,
  via_principal: z.boolean().nullable(),
  menu_digital: z.boolean().nullable(),
  notas: nullableText,
}) satisfies z.ZodType<ImportRow>;

const commitSchema = z.array(
  z.object({
    decision: z.enum(["create", "merge", "skip"]),
    duplicateId: z.number().int().positive().nullable(),
    data: parsedRowSchema,
    resolved: z.object({
      categoryId: z.number().int().positive(),
      stateId: z.number().int().positive(),
      municipalityId: z.number().int().positive().nullable(),
    }),
  }),
);

export async function commitImport(payload: unknown) {
  const items = commitSchema.parse(payload);
  const touched: number[] = [];
  let created = 0;
  let merged = 0;

  for (const item of items) {
    if (item.decision === "skip") continue;
    const d = item.data;
    const values = {
      name: d.nombre,
      categoryId: item.resolved.categoryId,
      stateId: item.resolved.stateId,
      municipalityId: item.resolved.municipalityId,
      sector: d.sector,
      address: d.direccion,
      location:
        d.latitud !== null && d.longitud !== null ? { lat: d.latitud, lng: d.longitud } : null,
      phone: d.telefono,
      whatsapp: d.whatsapp ?? d.telefono,
      instagram: d.instagram,
      facebook: d.facebook,
      tiktok: d.tiktok,
      website: d.web,
      onMainRoad: d.via_principal,
      hasDigitalMenu: d.menu_digital,
      notes: d.notas,
    };

    if (item.decision === "merge" && item.duplicateId) {
      const existing = await db.query.businesses.findFirst({
        where: eq(businesses.id, item.duplicateId),
      });
      if (!existing) continue;
      // Merge only fills gaps: never overwrite data that is already there.
      const patch = Object.fromEntries(
        Object.entries(values).filter(
          ([k, v]) =>
            v !== null &&
            existing[k as keyof typeof existing] === null &&
            k !== "name" &&
            k !== "stateId",
        ),
      );
      if (Object.keys(patch).length)
        await db.update(businesses).set(patch).where(eq(businesses.id, existing.id));
      touched.push(existing.id);
      merged++;
    } else {
      const [row] = await db
        .insert(businesses)
        .values({ ...values, source: "csv" })
        .onConflictDoNothing()
        .returning({ id: businesses.id });
      if (row) {
        touched.push(row.id);
        created++;
      }
    }
  }
  if (touched.length) await recomputeScores(db, touched);
  revalidatePath("/");
  return { created, merged, skipped: items.length - created - merged };
}
