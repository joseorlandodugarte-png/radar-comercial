import Papa from "papaparse";
import { z } from "zod";

import { parseInstagramHandle } from "@/lib/links/social";
import { slugify } from "@/lib/format/slug";

/** Canonical import/export columns (Spanish headers, as people write them in sheets). */
export const IMPORT_COLUMNS = [
  "nombre",
  "categoria",
  "estado",
  "municipio",
  "sector",
  "direccion",
  "latitud",
  "longitud",
  "telefono",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "web",
  "via_principal",
  "menu_digital",
  "notas",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

const ALIASES: Record<string, ImportColumn> = {
  name: "nombre",
  negocio: "nombre",
  category: "categoria",
  rubro: "categoria",
  state: "estado",
  municipality: "municipio",
  address: "direccion",
  lat: "latitud",
  latitude: "latitud",
  lng: "longitud",
  lon: "longitud",
  longitude: "longitud",
  phone: "telefono",
  tel: "telefono",
  ig: "instagram",
  website: "web",
  sitio_web: "web",
  en_via_principal: "via_principal",
  main_road: "via_principal",
  menu: "menu_digital",
  notes: "notas",
};

export function canonicalColumn(header: string): ImportColumn | null {
  const key = slugify(header).replace(/-/g, "_");
  if ((IMPORT_COLUMNS as readonly string[]).includes(key)) return key as ImportColumn;
  return ALIASES[key] ?? null;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalBool = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    const s = slugify(v ?? "");
    if (["si", "s", "yes", "true", "1", "x"].includes(s)) return true;
    if (["no", "n", "false", "0"].includes(s)) return false;
    return null;
  });

const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Número inválido: ${v}` });
        return z.NEVER;
      }
      return n;
    });

export const importRowSchema = z
  .object({
    nombre: z.string().trim().min(2, "Falta el nombre"),
    categoria: z.string().trim().min(1, "Falta la categoría"),
    estado: optionalText,
    municipio: optionalText,
    sector: optionalText,
    direccion: optionalText,
    latitud: optionalNumber(-90, 90),
    longitud: optionalNumber(-180, 180),
    telefono: optionalText,
    whatsapp: optionalText,
    instagram: optionalText.transform((v, ctx) => {
      if (v === null) return null;
      const handle = parseInstagramHandle(v);
      if (!handle) ctx.addIssue({ code: "custom", message: `Instagram inválido: ${v}` });
      return handle;
    }),
    facebook: optionalText,
    tiktok: optionalText,
    web: optionalText,
    via_principal: optionalBool,
    menu_digital: optionalBool,
    notas: optionalText,
  })
  .refine((r) => (r.latitud === null) === (r.longitud === null), {
    message: "Latitud y longitud van juntas",
    path: ["latitud"],
  });

export type ImportRow = z.infer<typeof importRowSchema>;

export type ParsedRow =
  | { line: number; ok: true; data: ImportRow }
  | { line: number; ok: false; errors: string[]; raw: Record<string, string> };

/** Maps arbitrary headers to canonical columns and validates each row. */
export function validateRecords(records: Record<string, unknown>[]): ParsedRow[] {
  return records.map((record, i) => {
    const raw: Record<string, string> = {};
    for (const [header, value] of Object.entries(record)) {
      const col = canonicalColumn(header);
      if (col && value !== null && value !== undefined) raw[col] = String(value);
    }
    const parsed = importRowSchema.safeParse(raw);
    const line = i + 2; // header is line 1
    if (parsed.success) return { line, ok: true, data: parsed.data };
    return { line, ok: false, errors: parsed.error.issues.map((e) => e.message), raw };
  });
}

export function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t"],
  });
  return result.data;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  // BOM so Excel opens accents correctly.
  return "﻿" + Papa.unparse(rows);
}
