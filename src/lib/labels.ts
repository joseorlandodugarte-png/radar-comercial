import type {
  DataSource,
  InteractionKind,
  LeadStage,
  Priority,
  Service,
  TrafficLight,
} from "@/db/schema";

export const TRAFFIC_LIGHTS: TrafficLight[] = ["red", "yellow", "green", "no_social", "unknown"];

export const TRAFFIC_LIGHT_LABEL: Record<TrafficLight, string> = {
  red: "Rojo",
  yellow: "Amarillo",
  green: "Verde",
  no_social: "Sin redes",
  unknown: "Sin medir",
};

export const TRAFFIC_LIGHT_HINT: Record<TrafficLight, string> = {
  red: "Redes débiles: necesita ayuda",
  yellow: "Redes regulares: puede mejorar",
  green: "Redes saludables",
  no_social: "No tiene redes registradas",
  unknown: "Tiene redes pero aún no se han medido",
};

/** Tailwind classes per traffic light (dot, soft badge). */
export const TRAFFIC_LIGHT_CLASS: Record<
  TrafficLight,
  { dot: string; badge: string; text: string }
> = {
  red: {
    dot: "bg-light-red",
    badge: "bg-light-red/12 text-light-red border-light-red/30",
    text: "text-light-red",
  },
  yellow: {
    dot: "bg-light-yellow",
    badge: "bg-light-yellow/15 text-amber-700 dark:text-light-yellow border-light-yellow/40",
    text: "text-amber-700 dark:text-light-yellow",
  },
  green: {
    dot: "bg-light-green",
    badge: "bg-light-green/12 text-light-green border-light-green/30",
    text: "text-light-green",
  },
  no_social: {
    dot: "bg-light-none",
    badge: "bg-light-none/12 text-light-none border-light-none/30",
    text: "text-light-none",
  },
  unknown: {
    dot: "bg-light-none/50 ring-1 ring-light-none",
    badge: "bg-transparent text-muted-foreground border-dashed border-light-none/50",
    text: "text-muted-foreground",
  },
};

/** Hex colours for the map and charts (MapLibre/Recharts need concrete colours). */
export const TRAFFIC_LIGHT_HEX: Record<TrafficLight, string> = {
  red: "#e5484d",
  yellow: "#f5b301",
  green: "#30a46c",
  no_social: "#6b7280",
  unknown: "#a1a1aa",
};

export const SERVICE_LABEL: Record<Service, string> = {
  social_setup: "Crear redes",
  video: "Video / reels",
  menu: "Menú digital",
  billboard: "Valla / pendón",
  flyer: "Flyers",
};

export const SERVICES: Service[] = ["social_setup", "video", "menu", "billboard", "flyer"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  max: "Máxima",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "won",
  "lost",
];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  replied: "Respondió",
  meeting: "Reunión",
  proposal: "Propuesta",
  won: "Ganado",
  lost: "Perdido",
};

export const INTERACTION_LABEL: Record<InteractionKind, string> = {
  whatsapp: "WhatsApp",
  call: "Llamada",
  visit: "Visita",
  instagram_dm: "Mensaje de Instagram",
  email: "Correo",
  note: "Nota",
};

export const SOURCE_LABEL: Record<DataSource, string> = {
  seed: "Demo",
  osm: "OpenStreetMap",
  google_places: "Google Places",
  instagram_graph: "Instagram (API oficial)",
  manual: "Carga manual",
  csv: "Importación CSV/Excel",
};
