/** The 23 states of Venezuela plus the Capital District, with ISO 3166-2:VE codes. */
export const STATES = [
  { name: "Distrito Capital", isoCode: "VE-A", capital: "Caracas" },
  { name: "Amazonas", isoCode: "VE-Z", capital: "Puerto Ayacucho" },
  { name: "Anzoátegui", isoCode: "VE-B", capital: "Barcelona" },
  { name: "Apure", isoCode: "VE-C", capital: "San Fernando de Apure" },
  { name: "Aragua", isoCode: "VE-D", capital: "Maracay" },
  { name: "Barinas", isoCode: "VE-E", capital: "Barinas" },
  { name: "Bolívar", isoCode: "VE-F", capital: "Ciudad Bolívar" },
  { name: "Carabobo", isoCode: "VE-G", capital: "Valencia" },
  { name: "Cojedes", isoCode: "VE-H", capital: "San Carlos" },
  { name: "Delta Amacuro", isoCode: "VE-Y", capital: "Tucupita" },
  { name: "Falcón", isoCode: "VE-I", capital: "Coro" },
  { name: "Guárico", isoCode: "VE-J", capital: "San Juan de los Morros" },
  { name: "La Guaira", isoCode: "VE-X", capital: "La Guaira" },
  { name: "Lara", isoCode: "VE-K", capital: "Barquisimeto" },
  { name: "Mérida", isoCode: "VE-L", capital: "Mérida" },
  { name: "Miranda", isoCode: "VE-M", capital: "Los Teques" },
  { name: "Monagas", isoCode: "VE-N", capital: "Maturín" },
  { name: "Nueva Esparta", isoCode: "VE-O", capital: "La Asunción" },
  { name: "Portuguesa", isoCode: "VE-P", capital: "Guanare" },
  { name: "Sucre", isoCode: "VE-R", capital: "Cumaná" },
  { name: "Táchira", isoCode: "VE-S", capital: "San Cristóbal" },
  { name: "Trujillo", isoCode: "VE-T", capital: "Trujillo" },
  { name: "Yaracuy", isoCode: "VE-U", capital: "San Felipe" },
  { name: "Zulia", isoCode: "VE-V", capital: "Maracaibo" },
] as const;

/**
 * The 23 municipalities of Mérida with their seats. `center` is the approximate
 * location of the municipal seat, used only to centre the map; boundaries come
 * later from OpenStreetMap (`pnpm ingest:osm --boundaries`).
 */
export const MERIDA_MUNICIPALITIES = [
  { name: "Alberto Adriani", seat: "El Vigía", lat: 8.6219, lng: -71.6556 },
  { name: "Andrés Bello", seat: "La Azulita", lat: 8.7131, lng: -71.4442 },
  { name: "Antonio Pinto Salinas", seat: "Santa Cruz de Mora", lat: 8.3833, lng: -71.65 },
  { name: "Aricagua", seat: "Aricagua", lat: 8.2203, lng: -71.1375 },
  { name: "Arzobispo Chacón", seat: "Canaguá", lat: 8.1333, lng: -71.45 },
  { name: "Campo Elías", seat: "Ejido", lat: 8.5467, lng: -71.24 },
  { name: "Caracciolo Parra Olmedo", seat: "Tucaní", lat: 8.9667, lng: -71.2667 },
  { name: "Cardenal Quintero", seat: "Santo Domingo", lat: 8.86, lng: -70.6833 },
  { name: "Guaraque", seat: "Guaraque", lat: 8.1667, lng: -71.7333 },
  { name: "Julio César Salas", seat: "Arapuey", lat: 9.2167, lng: -71.15 },
  { name: "Justo Briceño", seat: "Torondoy", lat: 8.9333, lng: -71.0333 },
  { name: "Libertador", seat: "Mérida", lat: 8.5897, lng: -71.1561 },
  { name: "Miranda", seat: "Timotes", lat: 8.9833, lng: -70.7333 },
  { name: "Obispo Ramos de Lora", seat: "Santa Elena de Arenales", lat: 8.8167, lng: -71.4667 },
  { name: "Padre Noguera", seat: "Santa María de Caparo", lat: 7.8833, lng: -71.45 },
  { name: "Pueblo Llano", seat: "Pueblo Llano", lat: 8.9167, lng: -70.6667 },
  { name: "Rangel", seat: "Mucuchíes", lat: 8.75, lng: -70.9167 },
  { name: "Rivas Dávila", seat: "Bailadores", lat: 8.25, lng: -71.8333 },
  { name: "Santos Marquina", seat: "Tabay", lat: 8.6333, lng: -71.0667 },
  { name: "Sucre", seat: "Lagunillas", lat: 8.5, lng: -71.3833 },
  { name: "Tovar", seat: "Tovar", lat: 8.3333, lng: -71.75 },
  { name: "Tulio Febres Cordero", seat: "Nueva Bolivia", lat: 9.15, lng: -71.4167 },
  { name: "Zea", seat: "Zea", lat: 8.3833, lng: -71.7833 },
] as const;
