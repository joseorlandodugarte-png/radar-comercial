type CategorySeed = {
  slug: string;
  name: string;
  icon: string;
  servesFood?: boolean;
  children?: Omit<CategorySeed, "children">[];
};

/** Root categories (with lucide icon names) and their subcategories. */
export const CATEGORIES: CategorySeed[] = [
  {
    slug: "gastronomia",
    name: "Gastronomía",
    icon: "UtensilsCrossed",
    servesFood: true,
    children: [
      { slug: "restaurantes", name: "Restaurantes", icon: "UtensilsCrossed" },
      { slug: "cafes", name: "Cafés", icon: "Coffee" },
      { slug: "panaderias", name: "Panaderías y pastelerías", icon: "Croissant" },
      { slug: "comida-rapida", name: "Comida rápida", icon: "Sandwich" },
      { slug: "heladerias", name: "Heladerías", icon: "IceCreamCone" },
    ],
  },
  {
    slug: "bares",
    name: "Bares",
    icon: "Beer",
    servesFood: true,
    children: [
      { slug: "bares-pubs", name: "Bares y pubs", icon: "Beer" },
      { slug: "discotecas", name: "Discotecas", icon: "Music" },
    ],
  },
  {
    slug: "comercio",
    name: "Comercio",
    icon: "ShoppingBag",
    children: [
      { slug: "ropa-calzado", name: "Ropa y calzado", icon: "Shirt" },
      { slug: "ferreterias", name: "Ferreterías", icon: "Hammer" },
      { slug: "tecnologia", name: "Tecnología", icon: "Smartphone" },
      { slug: "artesania", name: "Artesanía y regalos", icon: "Gift" },
    ],
  },
  {
    slug: "mercados",
    name: "Mercados",
    icon: "Store",
    children: [
      { slug: "supermercados", name: "Supermercados", icon: "ShoppingCart" },
      { slug: "abastos", name: "Abastos y bodegas", icon: "Store" },
      { slug: "fruterias", name: "Fruterías y verdulerías", icon: "Apple" },
    ],
  },
  {
    slug: "belleza",
    name: "Belleza",
    icon: "Scissors",
    children: [
      { slug: "peluquerias", name: "Peluquerías", icon: "Scissors" },
      { slug: "barberias", name: "Barberías", icon: "Scissors" },
      { slug: "spas-unas", name: "Spas y uñas", icon: "Sparkles" },
    ],
  },
  {
    slug: "salud",
    name: "Salud",
    icon: "HeartPulse",
    children: [
      { slug: "farmacias", name: "Farmacias", icon: "Pill" },
      { slug: "consultorios", name: "Consultorios y clínicas", icon: "Stethoscope" },
      { slug: "odontologia", name: "Odontología", icon: "Smile" },
    ],
  },
  {
    slug: "gimnasios",
    name: "Gimnasios",
    icon: "Dumbbell",
    children: [
      { slug: "gimnasios-fitness", name: "Gimnasios", icon: "Dumbbell" },
      { slug: "yoga-baile", name: "Yoga, baile y crossfit", icon: "Activity" },
    ],
  },
  {
    slug: "hospedaje",
    name: "Hospedaje",
    icon: "BedDouble",
    children: [
      { slug: "hoteles", name: "Hoteles", icon: "Hotel" },
      { slug: "posadas", name: "Posadas", icon: "BedDouble" },
    ],
  },
  {
    slug: "servicios",
    name: "Servicios",
    icon: "Wrench",
    children: [
      { slug: "talleres", name: "Talleres mecánicos", icon: "Wrench" },
      { slug: "lavanderias", name: "Lavanderías", icon: "Shirt" },
      { slug: "otros-servicios", name: "Otros servicios", icon: "Briefcase" },
    ],
  },
];

export const TAGS = [
  { slug: "promociones", name: "Promociones", color: "amber" },
  { slug: "eventos", name: "Eventos", color: "violet" },
  { slug: "turistico", name: "Zona turística", color: "sky" },
  { slug: "delivery", name: "Delivery", color: "emerald" },
];
