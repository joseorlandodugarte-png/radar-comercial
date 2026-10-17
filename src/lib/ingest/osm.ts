import { parseInstagramHandle } from "@/lib/links/social";

/** Overpass element as returned with `out center tags;`. */
export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type OsmBusiness = {
  osmId: string;
  name: string;
  categorySlug: string;
  lat: number;
  lng: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  sector: string | null;
};

const AMENITY: Record<string, string> = {
  restaurant: "restaurantes",
  cafe: "cafes",
  fast_food: "comida-rapida",
  ice_cream: "heladerias",
  bar: "bares-pubs",
  pub: "bares-pubs",
  biergarten: "bares-pubs",
  nightclub: "discotecas",
  pharmacy: "farmacias",
  clinic: "consultorios",
  doctors: "consultorios",
  dentist: "odontologia",
  marketplace: "mercados",
};

const SHOP: Record<string, string> = {
  supermarket: "supermercados",
  convenience: "abastos",
  general: "abastos",
  greengrocer: "fruterias",
  bakery: "panaderias",
  pastry: "panaderias",
  confectionery: "panaderias",
  clothes: "ropa-calzado",
  shoes: "ropa-calzado",
  boutique: "ropa-calzado",
  hardware: "ferreterias",
  doityourself: "ferreterias",
  mobile_phone: "tecnologia",
  electronics: "tecnologia",
  computer: "tecnologia",
  gift: "artesania",
  craft: "artesania",
  hairdresser: "peluquerias",
  beauty: "spas-unas",
  cosmetics: "spas-unas",
  car_repair: "talleres",
  laundry: "lavanderias",
  dry_cleaning: "lavanderias",
};

const TOURISM: Record<string, string> = {
  hotel: "hoteles",
  motel: "hoteles",
  guest_house: "posadas",
  hostel: "posadas",
};

/** Maps OSM tags to our category slugs. Returns null for things that are not businesses we track. */
export function categoryForTags(tags: Record<string, string>): string | null {
  if (tags.amenity && AMENITY[tags.amenity]) return AMENITY[tags.amenity]!;
  if (tags.shop) {
    if (
      tags.shop === "hairdresser" &&
      /barber|male/i.test(`${tags.hairdresser ?? ""} ${tags.name ?? ""}`)
    )
      return "barberias";
    return SHOP[tags.shop] ?? "comercio";
  }
  if (tags.tourism && TOURISM[tags.tourism]) return TOURISM[tags.tourism]!;
  if (tags.leisure === "fitness_centre" || tags.leisure === "sports_centre")
    return "gimnasios-fitness";
  if (tags.craft === "car_repair") return "talleres";
  return null;
}

export function mapOsmElement(el: OsmElement): OsmBusiness | null {
  const tags = el.tags ?? {};
  const name = (tags.name ?? tags["name:es"] ?? tags.brand)?.trim();
  if (!name) return null;
  const categorySlug = categoryForTags(tags);
  if (!categorySlug) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const first = (...keys: string[]) => {
    for (const k of keys) {
      const v = tags[k]?.split(";")[0]?.trim();
      if (v) return v;
    }
    return null;
  };
  const igRaw = first("contact:instagram", "instagram");
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");

  return {
    osmId: `${el.type}/${el.id}`,
    name,
    categorySlug,
    lat,
    lng,
    phone: first("phone", "contact:phone", "contact:mobile"),
    whatsapp: first("contact:whatsapp", "whatsapp"),
    website: first("website", "contact:website", "url"),
    instagram: parseInstagramHandle(igRaw),
    facebook: first("contact:facebook", "facebook"),
    address: street || first("addr:full"),
    sector: first("addr:suburb", "addr:neighbourhood", "addr:quarter"),
  };
}

/** Businesses inside a Venezuelan state, identified by its ISO 3166-2 code (e.g. VE-L for Mérida). */
export function businessesQuery(isoCode: string, timeoutSeconds = 180) {
  return `[out:json][timeout:${timeoutSeconds}];
area["ISO3166-2"="${isoCode}"]->.state;
(
  nwr["amenity"~"^(${Object.keys(AMENITY).join("|")})$"]["name"](area.state);
  nwr["shop"]["name"](area.state);
  nwr["tourism"~"^(${Object.keys(TOURISM).join("|")})$"]["name"](area.state);
  nwr["leisure"~"^(fitness_centre|sports_centre)$"]["name"](area.state);
  nwr["craft"="car_repair"]["name"](area.state);
);
out center tags;`;
}

/** Main roads (for the Valla/Pendón rule), with geometry. */
export function mainRoadsQuery(isoCode: string, timeoutSeconds = 180) {
  return `[out:json][timeout:${timeoutSeconds}];
area["ISO3166-2"="${isoCode}"]->.state;
way["highway"~"^(motorway|trunk|primary|secondary)$"](area.state);
out geom;`;
}

/** Municipal boundaries (admin_level 6 in Venezuela), with member geometry. */
export function municipalBoundariesQuery(isoCode: string, timeoutSeconds = 180) {
  return `[out:json][timeout:${timeoutSeconds}];
area["ISO3166-2"="${isoCode}"]->.state;
relation["boundary"="administrative"]["admin_level"="6"](area.state);
out geom;`;
}

/** "Municipio Libertador" → "Libertador" so OSM names match our seed. */
export function cleanMunicipalityName(name: string) {
  return name.replace(/^municipio\s+(aut[oó]nomo\s+)?/i, "").trim();
}
