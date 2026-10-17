import type { Factor, ScoreResult } from "./types";

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / DAY_MS;
}

type PartialFactor = Omit<Factor, "points">;

/**
 * Combines factors into a 0-100 score. Factors without data are excluded and
 * their weight is shared among the rest. Below `minCoverage` the score is null.
 */
export function combineFactors(factors: PartialFactor[], minCoverage: number): ScoreResult {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const known = factors.filter((f) => f.value !== null);
  const knownWeight = known.reduce((sum, f) => sum + f.weight, 0);
  const coverage = totalWeight === 0 ? 0 : knownWeight / totalWeight;

  if (knownWeight === 0 || coverage < minCoverage) {
    return {
      score: null,
      coverage,
      factors: factors.map((f) => ({ ...f, points: null })),
      note: "Datos insuficientes para calcular este puntaje",
    };
  }

  const withPoints: Factor[] = factors.map((f) => ({
    ...f,
    points: f.value === null ? null : round1((f.value * f.weight * 100) / knownWeight),
  }));
  const raw = known.reduce((sum, f) => sum + (f.value ?? 0) * f.weight, 0) / knownWeight;

  return {
    score: Math.round(raw * 100),
    coverage,
    factors: withPoints,
    note:
      coverage < 1 ? "Algunos factores no tienen dato; su peso se repartió entre los demás" : null,
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  return a === undefined || b === undefined ? null : (a + b) / 2;
}
