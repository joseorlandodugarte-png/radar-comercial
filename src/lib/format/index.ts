export const SIN_DATO = "Sin dato";

const numberFmt = new Intl.NumberFormat("es-VE");
const compactFmt = new Intl.NumberFormat("es-VE", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFmt = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});
const shortDateFmt = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  timeZone: "America/Caracas",
});

export function formatNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? SIN_DATO : numberFmt.format(n);
}

export function formatCompact(n: number | null | undefined): string {
  return n === null || n === undefined ? SIN_DATO : compactFmt.format(n);
}

/** 0.034 → "3,4 %" */
export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined) return SIN_DATO;
  return `${(fraction * 100).toFixed(digits).replace(".", ",")} %`;
}

export function formatRating(r: number | null | undefined): string {
  return r === null || r === undefined ? SIN_DATO : `${r.toFixed(1).replace(".", ",")} ★`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return SIN_DATO;
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return SIN_DATO;
  return shortDateFmt.format(typeof d === "string" ? new Date(d) : d);
}

/** "hoy", "ayer", "hace 5 días", "en 3 días", "hace 2 meses". */
export function formatRelative(d: Date | string | null | undefined, now = new Date()): string {
  if (!d) return SIN_DATO;
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === -1) return "ayer";
  if (days === 1) return "mañana";
  const abs = Math.abs(days);
  const label = abs >= 60 ? `${Math.round(abs / 30)} meses` : `${abs} días`;
  return days < 0 ? `hace ${label}` : `en ${label}`;
}

export function formatBool(v: boolean | null | undefined, yes = "Sí", no = "No"): string {
  return v === null || v === undefined ? SIN_DATO : v ? yes : no;
}
