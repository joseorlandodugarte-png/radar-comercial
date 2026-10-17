"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { interactionKindEnum, interactions, leadStageEnum, leads } from "@/db/schema";

const idSchema = z.number().int().positive();

async function ensureLead(businessId: number) {
  const existing = await db.query.leads.findFirst({ where: eq(leads.businessId, businessId) });
  if (existing) return existing;
  const [created] = await db.insert(leads).values({ businessId }).onConflictDoNothing().returning();
  return created ?? (await db.query.leads.findFirst({ where: eq(leads.businessId, businessId) }))!;
}

function revalidate(businessId: number) {
  revalidatePath(`/negocio/${businessId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
}

export async function setLeadStage(businessId: number, stage: string, lostReason?: string) {
  const id = idSchema.parse(businessId);
  const newStage = z.enum(leadStageEnum.enumValues).parse(stage);
  const lead = await ensureLead(id);
  if (lead.stage !== newStage) {
    await db
      .update(leads)
      .set({
        stage: newStage,
        stageChangedAt: new Date(),
        lostReason: newStage === "lost" ? (lostReason ?? null) : null,
      })
      .where(eq(leads.id, lead.id));
  }
  revalidate(id);
  return { ok: true as const, stage: newStage };
}

export async function setNextAction(businessId: number, date: string | null, note: string | null) {
  const id = idSchema.parse(businessId);
  const parsed = z
    .object({
      date: z.iso.date().nullable(),
      note: z.string().trim().max(500).nullable(),
    })
    .parse({ date: date || null, note: note || null });
  const lead = await ensureLead(id);
  await db
    .update(leads)
    // Noon Caracas time so the date never shifts across time zones.
    .set({
      nextActionAt: parsed.date ? new Date(`${parsed.date}T12:00:00-04:00`) : null,
      nextActionNote: parsed.note,
    })
    .where(eq(leads.id, lead.id));
  revalidate(id);
  return { ok: true as const };
}

export async function addInteraction(businessId: number, kind: string, body: string | null) {
  const id = idSchema.parse(businessId);
  const parsed = z
    .object({
      kind: z.enum(interactionKindEnum.enumValues),
      body: z.string().trim().max(2000).nullable(),
    })
    .parse({ kind, body: body || null });
  const lead = await ensureLead(id);
  await db.insert(interactions).values({ leadId: lead.id, kind: parsed.kind, body: parsed.body });
  // Reaching out by WhatsApp from a "new" lead moves it to "contacted" automatically.
  if (lead.stage === "new" && parsed.kind !== "note") {
    await db
      .update(leads)
      .set({ stage: "contacted", stageChangedAt: new Date() })
      .where(eq(leads.id, lead.id));
  }
  revalidate(id);
  return { ok: true as const };
}
