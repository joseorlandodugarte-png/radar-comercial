import { whatsappTemplates } from "@config/messages";
import type { Service } from "@/db/schema";

/**
 * Normalises a Venezuelan phone number to international digits (58XXXXXXXXXX).
 * Accepts "0414-123.45.67", "+58 414 1234567", "584141234567", "4141234567".
 * Returns null when it does not look like a valid Venezuelan number.
 */
export function normalizeVePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("58")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Venezuelan numbers are 10 digits without the leading 0 (area/operator code + 7 digits).
  if (!/^[2-9]\d{9}$/.test(digits)) return null;
  return `58${digits}`;
}

export function isMobileVe(normalized: string): boolean {
  return /^58(41[246]|42[46])/.test(normalized);
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function whatsappMessage(params: {
  businessName: string;
  service: Service | null;
  senderName: string;
  municipality: string | null;
}): string {
  const template = whatsappTemplates[params.service ?? "default"];
  return fillTemplate(template, {
    negocio: params.businessName,
    yo: params.senderName,
    municipio: params.municipality ?? "Mérida",
  });
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeVePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
