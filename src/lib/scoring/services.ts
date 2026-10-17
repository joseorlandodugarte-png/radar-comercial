import { scoringConfig, type ScoringConfig } from "@config/scoring";
import type { Priority } from "@/db/schema";

import type { ScoringInput, ServiceSuggestion } from "./types";

const PRIORITY_RANK: Record<Priority, number> = { max: 0, high: 1, medium: 2, low: 3 };

/** Explainable rules that map a business's situation to the services Pepe offers. */
export function suggestServices(
  input: ScoringInput,
  cfg: ScoringConfig = scoringConfig,
): ServiceSuggestion[] {
  const out: ServiceSuggestion[] = [];
  const s = input.social;

  if (!input.instagram) {
    out.push({
      service: "social_setup",
      priority: "max",
      ruleId: "no_instagram",
      reason: "No tiene Instagram: crear y arrancar su perfil es la máxima prioridad",
    });
    out.push({
      service: "video",
      priority: "high",
      ruleId: "no_instagram_video",
      reason: "Sin Instagram, necesita contenido en video para arrancar",
    });
  } else if (s) {
    const threshold = cfg.services.fewVideosThreshold;
    if (s.reelsLast30d !== null && s.reelsLast30d < threshold) {
      out.push({
        service: "video",
        priority: "high",
        ruleId: "few_videos",
        reason: `Solo ${s.reelsLast30d} reels en los últimos 30 días (menos de ${threshold})`,
      });
    } else if (s.reelsLast30d === null && s.usesReels === false) {
      out.push({
        service: "video",
        priority: "high",
        ruleId: "no_reels",
        reason: "No publica reels",
      });
    }
  }

  if (input.servesFood) {
    if (input.hasDigitalMenu === false) {
      out.push({
        service: "menu",
        priority: "high",
        ruleId: "no_digital_menu",
        reason: "Sirve comida o bebidas y no tiene menú digital",
      });
    } else if (input.hasDigitalMenu === null) {
      out.push({
        service: "menu",
        priority: "low",
        ruleId: "digital_menu_unknown",
        reason: "Sirve comida o bebidas; sin dato de menú digital, verifícalo",
      });
    }
  }

  if (input.onMainRoad === true) {
    out.push({
      service: "billboard",
      priority: "medium",
      ruleId: "main_road",
      reason: "Está en una vía principal: una valla o pendón se ve desde la calle",
    });
  }

  const promoTag = input.tagSlugs.find((t) => cfg.services.promoTagSlugs.includes(t));
  if (promoTag || s?.mentionsPromotions) {
    out.push({
      service: "flyer",
      priority: "medium",
      ruleId: promoTag ? "promo_tag" : "promo_bio",
      reason: promoTag
        ? `Etiquetado con «${promoTag}»: los flyers impulsan promociones y eventos`
        : "Su perfil menciona promociones o eventos",
    });
  }

  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
