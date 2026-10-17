"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { businesses, manualReviewQueue, reviewStatusEnum } from "@/db/schema";
import { parseGoogleMapsLink, parseInstagramHandle, type ParsedMapsLink } from "@/lib/links/social";
import { findExistingDuplicate } from "@/server/dedupe";
import { municipalityForPoint } from "@/server/geo";
import { recomputeScores } from "@/server/scoring-service";

export type CreateBusinessState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "duplicate"; match: { id: number; name: string; reason: string } };

const triState = z
  .enum(["si", "no", ""])
  .optional()
  .transform((v) => (v === "si" ? true : v === "no" ? false : null));
const optText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));
const optNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= min && v <= max),
      "Coordenada inválida",
    );

const createSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del negocio"),
  categoryId: z.coerce.number().int().positive("Elige una categoría"),
  stateId: z.coerce.number().int().positive("Elige un estado"),
  municipalityId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null)),
  sector: optText,
  address: optText,
  lat: optNumber(-90, 90),
  lng: optNumber(-180, 180),
  phone: optText,
  whatsapp: optText,
  instagram: optText.transform((v, ctx) => {
    if (!v) return null;
    const handle = parseInstagramHandle(v);
    if (!handle)
      ctx.addIssue({ code: "custom", message: "Ese Instagram no parece un perfil válido" });
    return handle;
  }),
  googlePlaceId: optText,
  onMainRoad: triState,
  hasDigitalMenu: triState,
  notes: optText,
  force: z
    .string()
    .optional()
    .transform((v) => v === "1"),
});

export async function createBusiness(
  _prev: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Revisa los campos marcados", fieldErrors };
  }
  const d = parsed.data;
  const location = d.lat !== null && d.lng !== null ? { lat: d.lat, lng: d.lng } : null;

  if (!d.force) {
    const dup = await findExistingDuplicate({
      name: d.name,
      stateId: d.stateId,
      instagram: d.instagram,
      phone: d.phone,
      whatsapp: d.whatsapp,
      googlePlaceId: d.googlePlaceId,
      location,
    });
    if (dup)
      return { status: "duplicate", match: { id: dup.id, name: dup.name, reason: dup.reason } };
  }

  const municipalityId =
    d.municipalityId ??
    (location ? await municipalityForPoint(d.stateId, location.lng, location.lat) : null);

  const [row] = await db
    .insert(businesses)
    .values({
      name: d.name,
      categoryId: d.categoryId,
      stateId: d.stateId,
      municipalityId,
      sector: d.sector,
      address: d.address,
      location,
      phone: d.phone,
      whatsapp: d.whatsapp ?? d.phone,
      instagram: d.instagram,
      googlePlaceId: d.googlePlaceId,
      onMainRoad: d.onMainRoad,
      hasDigitalMenu: d.hasDigitalMenu,
      notes: d.notes,
      source: "manual",
    })
    .returning({ id: businesses.id });
  if (!row) return { status: "error", message: "No se pudo guardar. Intenta de nuevo." };

  await recomputeScores(db, [row.id]);
  revalidatePath("/");
  redirect(`/negocio/${row.id}?nuevo=1`);
}

/**
 * Expands a maps.app.goo.gl short link by reading its redirect target (one request,
 * no page content is read) and parses name/coordinates from the long URL.
 */
export async function resolveMapsLink(input: string): Promise<ParsedMapsLink | null> {
  const parsed = parseGoogleMapsLink(input);
  if (!parsed?.isShortLink) return parsed;
  try {
    let url = input.trim();
    for (let hop = 0; hop < 3; hop++) {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const next = res.headers.get("location");
      if (!next) break;
      url = new URL(next, url).toString();
      const long = parseGoogleMapsLink(url);
      if (long && !long.isShortLink) return long;
    }
  } catch {
    // Network unavailable: the user can still use their current location.
  }
  return parsed;
}

export async function updateNotes(businessId: number, notes: string) {
  const id = z.number().int().positive().parse(businessId);
  await db
    .update(businesses)
    .set({ notes: z.string().max(5000).parse(notes) || null })
    .where(eq(businesses.id, id));
  revalidatePath(`/negocio/${id}`);
  return { ok: true as const };
}

export async function setReviewStatus(reviewId: number, status: string) {
  const id = z.number().int().positive().parse(reviewId);
  const s = z.enum(reviewStatusEnum.enumValues).parse(status);
  await db.update(manualReviewQueue).set({ status: s }).where(eq(manualReviewQueue.id, id));
  revalidatePath("/mas/revision");
  return { ok: true as const };
}
