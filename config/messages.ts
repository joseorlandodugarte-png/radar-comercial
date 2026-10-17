import type { Service } from "@/db/schema";

/**
 * WhatsApp message templates, one per suggested service. Placeholders:
 * {negocio} business name, {yo} your name (NEXT_PUBLIC_SENDER_NAME), {municipio} municipality.
 */
export const whatsappTemplates: Record<Service | "default", string> = {
  social_setup:
    "¡Hola, {negocio}! 👋 Soy {yo}, productor audiovisual en {municipio}. Vi que todavía no tienen Instagram y me encantaría ayudarles a arrancar sus redes con fotos y videos profesionales. ¿Les cuento cómo?",
  video:
    "¡Hola, {negocio}! 👋 Soy {yo}, hago videos y reels para negocios en {municipio}. Vi su Instagram y creo que unos reels de lo que ofrecen les traerían más clientes. ¿Les muestro algunas ideas?",
  menu: "¡Hola, {negocio}! 👋 Soy {yo}, diseñador en {municipio}. Hago menús digitales con código QR, fáciles de actualizar y bonitos para redes. ¿Les interesa ver ejemplos?",
  billboard:
    "¡Hola, {negocio}! 👋 Soy {yo}, diseñador en {municipio}. Su local está en una vía con mucho paso y una valla o pendón llamativo podría atraer más clientes. ¿Les muestro propuestas?",
  flyer:
    "¡Hola, {negocio}! 👋 Soy {yo}, diseñador en {municipio}. Vi que hacen promociones y eventos; diseño flyers para redes e impresos que llaman la atención. ¿Les preparo una idea para el próximo?",
  default:
    "¡Hola, {negocio}! 👋 Soy {yo}, productor audiovisual y diseñador en {municipio}. Hago videos, reels, menús, vallas y flyers para negocios. ¿Les puedo mostrar mi trabajo?",
};
