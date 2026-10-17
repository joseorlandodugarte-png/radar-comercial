/**
 * ~60 FICTIONAL demo businesses for Mérida. Names, handles and phone numbers are
 * invented and marked with source "seed"; the UI labels them "DEMO". Phone numbers
 * use the unassigned 0000 block so a test tap on WhatsApp reaches nobody.
 */

export type SocialProfile = "none" | "unmeasured" | "weak" | "mid" | "strong" | "facebook_only";
export type ReviewProfile = "great" | "good" | "low" | "none";

export type DemoBusiness = {
  name: string;
  category: string;
  municipality: string;
  sector: string;
  social: SocialProfile;
  reviews: ReviewProfile;
  onMainRoad: boolean | null;
  hasDigitalMenu: boolean | null;
  tags?: string[];
};

const d = (
  name: string,
  category: string,
  municipality: string,
  sector: string,
  social: SocialProfile,
  reviews: ReviewProfile,
  onMainRoad: boolean | null,
  hasDigitalMenu: boolean | null = null,
  tags: string[] = [],
): DemoBusiness => ({
  name,
  category,
  municipality,
  sector,
  social,
  reviews,
  onMainRoad,
  hasDigitalMenu,
  tags,
});

export const DEMO_BUSINESSES: DemoBusiness[] = [
  // Libertador (Mérida city)
  d("Sabores del Páramo", "restaurantes", "Libertador", "Centro", "weak", "great", true, false, [
    "promociones",
  ]),
  d(
    "Fogón de la Abuela Chepa",
    "restaurantes",
    "Libertador",
    "Belén",
    "weak",
    "good",
    false,
    false,
  ),
  d("Trucha y Leña", "restaurantes", "Libertador", "Las Américas", "mid", "great", true, true),
  d(
    "La Pizarra Gourmet",
    "restaurantes",
    "Libertador",
    "La Hechicera",
    "strong",
    "great",
    false,
    true,
    ["eventos"],
  ),
  d("Comedor El Arriero", "restaurantes", "Libertador", "Santa Juana", "none", "good", true, false),
  d("Pasta & Montaña", "restaurantes", "Libertador", "El Llano", "weak", "low", false, null),
  d("Rincón Andino", "restaurantes", "Libertador", "Milla", "unmeasured", "good", true, null),
  d(
    "Parrilla Los Próceres",
    "restaurantes",
    "Libertador",
    "Glorias Patrias",
    "weak",
    "great",
    true,
    false,
    ["eventos"],
  ),
  d("Café La Neblina", "cafes", "Libertador", "Centro", "strong", "great", false, true),
  d("Tostado Serrano", "cafes", "Libertador", "Belén", "mid", "good", false, false),
  d("Café del Teleférico", "cafes", "Libertador", "Pie del Llano", "weak", "great", true, false, [
    "turistico",
  ]),
  d("Panadería Santa Elena", "panaderias", "Libertador", "Santa Elena", "none", "good", true, null),
  d(
    "Dulces Típicos Doña Rosa",
    "panaderias",
    "Libertador",
    "Centro",
    "weak",
    "great",
    false,
    null,
    ["turistico"],
  ),
  d("Arepera La Sabrosa", "comida-rapida", "Libertador", "Los Curos", "none", "low", true, false),
  d("Burger Andes", "comida-rapida", "Libertador", "Las Américas", "mid", "good", true, true, [
    "delivery",
    "promociones",
  ]),
  d("Helados Nevado", "heladerias", "Libertador", "Centro", "strong", "great", false, null, [
    "turistico",
  ]),
  d("Bar La Cumbre", "bares-pubs", "Libertador", "Milla", "weak", "good", true, false, ["eventos"]),
  d(
    "Cervecería Artesanal Mucujún",
    "bares-pubs",
    "Libertador",
    "La Hechicera",
    "mid",
    "great",
    false,
    true,
    ["eventos"],
  ),
  d("Discoteca Altitud", "discotecas", "Libertador", "Las Américas", "mid", "low", true, null, [
    "eventos",
    "promociones",
  ]),
  d("Boutique Frailejón", "ropa-calzado", "Libertador", "Centro", "weak", "none", true),
  d("Calzados La Plaza", "ropa-calzado", "Libertador", "Centro", "none", "none", true),
  d("Ferretería El Tornillo Feliz", "ferreterias", "Libertador", "Chamita", "none", "good", true),
  d("TecnoAndes Celulares", "tecnologia", "Libertador", "Las Américas", "mid", "good", true, null, [
    "promociones",
  ]),
  d(
    "Artesanías Sierra Nevada",
    "artesania",
    "Libertador",
    "Pie del Llano",
    "weak",
    "great",
    false,
    null,
    ["turistico"],
  ),
  d(
    "Mercadito Los Andes",
    "supermercados",
    "Libertador",
    "Santa Juana",
    "weak",
    "good",
    true,
    null,
    ["promociones"],
  ),
  d("Abasto El Vecino", "abastos", "Libertador", "Belén", "none", "none", false),
  d("Frutería Tropical Andina", "fruterias", "Libertador", "Milla", "facebook_only", "good", false),
  d("Barbería El Caballero", "barberias", "Libertador", "Centro", "strong", "great", false),
  d(
    "Estilo y Color Peluquería",
    "peluquerias",
    "Libertador",
    "Glorias Patrias",
    "weak",
    "good",
    true,
  ),
  d("Uñas Bonitas Spa", "spas-unas", "Libertador", "La Hechicera", "mid", "great", false, null, [
    "promociones",
  ]),
  d("Farmacia Bienestar", "farmacias", "Libertador", "El Llano", "facebook_only", "good", true),
  d(
    "Odontología Sonrisa Andina",
    "odontologia",
    "Libertador",
    "Las Américas",
    "weak",
    "great",
    false,
  ),
  d(
    "Gimnasio Fuerza Andina",
    "gimnasios-fitness",
    "Libertador",
    "Los Curos",
    "mid",
    "good",
    true,
    null,
    ["promociones"],
  ),
  d("Posada Las Heroínas", "posadas", "Libertador", "Centro", "weak", "great", false, null, [
    "turistico",
  ]),
  d(
    "Hotel Mirador del Chama",
    "hoteles",
    "Libertador",
    "Pie del Llano",
    "strong",
    "great",
    true,
    null,
    ["turistico"],
  ),
  d("Lavandería Burbujas", "lavanderias", "Libertador", "Santa Elena", "none", "low", false),

  // Campo Elías (Ejido)
  d(
    "Restaurante El Trapiche",
    "restaurantes",
    "Campo Elías",
    "Centro de Ejido",
    "weak",
    "great",
    true,
    false,
  ),
  d("Dulcería Ejido Real", "panaderias", "Campo Elías", "Centro de Ejido", "none", "good", true),
  d("Café Montalbán", "cafes", "Campo Elías", "Montalbán", "unmeasured", "good", false, null),
  d("Autolavado y Taller Pozo Hondo", "talleres", "Campo Elías", "Pozo Hondo", "none", "low", true),
  d(
    "Peluquería Glamour Ejido",
    "peluquerias",
    "Campo Elías",
    "Centro de Ejido",
    "weak",
    "good",
    false,
  ),
  d(
    "Supermercado La Mesa",
    "supermercados",
    "Campo Elías",
    "Montalbán",
    "mid",
    "good",
    true,
    null,
    ["promociones"],
  ),

  // Alberto Adriani (El Vigía)
  d(
    "Parrillera El Vigía",
    "restaurantes",
    "Alberto Adriani",
    "Centro",
    "weak",
    "great",
    true,
    false,
    ["eventos"],
  ),
  d("Pollos Bolero", "comida-rapida", "Alberto Adriani", "Bolero", "none", "good", true, false, [
    "delivery",
  ]),
  d(
    "Tienda La Económica",
    "ropa-calzado",
    "Alberto Adriani",
    "Buenos Aires",
    "facebook_only",
    "none",
    true,
    null,
    ["promociones"],
  ),
  d("Gym Power Vigía", "gimnasios-fitness", "Alberto Adriani", "Carabobo", "mid", "good", true),
  d("Farmacia del Sur", "farmacias", "Alberto Adriani", "Centro", "none", "good", true),

  // Santos Marquina (Tabay)
  d(
    "Truchicultura La Mucuy",
    "restaurantes",
    "Santos Marquina",
    "La Mucuy",
    "weak",
    "great",
    false,
    false,
    ["turistico"],
  ),
  d("Posada Los Frailes", "posadas", "Santos Marquina", "Las Cruces", "mid", "great", false, null, [
    "turistico",
  ]),
  d("Café Tabay", "cafes", "Santos Marquina", "Centro de Tabay", "none", "good", true, null),
  d("Abasto La Plaza Tabay", "abastos", "Santos Marquina", "Centro de Tabay", "none", "none", true),

  // Sucre (Lagunillas)
  d("Comedor Laguna de Urao", "restaurantes", "Sucre", "Lagunillas", "none", "good", true, false, [
    "turistico",
  ]),
  d("Panadería San Juan", "panaderias", "Sucre", "San Juan", "weak", "good", true),
  d("Bodegón Chiguará", "abastos", "Sucre", "Chiguará", "facebook_only", "low", false),

  // Tovar
  d(
    "Restaurante Valle del Mocotíes",
    "restaurantes",
    "Tovar",
    "Centro de Tovar",
    "weak",
    "good",
    true,
    false,
  ),
  d("Heladería Tovar", "heladerias", "Tovar", "El Llano", "mid", "great", false),
  d(
    "Consultorio Médico Mocotíes",
    "consultorios",
    "Tovar",
    "Centro de Tovar",
    "none",
    "good",
    false,
  ),

  // Rangel (Mucuchíes)
  d("Mesón del Páramo", "restaurantes", "Rangel", "Mucuchíes", "weak", "great", true, false, [
    "turistico",
  ]),
  d("Posada Apartaderos", "posadas", "Rangel", "Apartaderos", "unmeasured", "great", true, null, [
    "turistico",
  ]),
  d("Quesera Mucurubá", "abastos", "Rangel", "Mucurubá", "none", "good", true, null, ["turistico"]),
];
