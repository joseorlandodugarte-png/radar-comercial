import { customType } from "drizzle-orm/pg-core";

export type LngLat = { lng: number; lat: number };

/** Parses a hex-encoded (E)WKB point as returned by PostGIS. */
export function parseWkbPoint(hex: string): LngLat {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  let offset = 5;
  if (type & 0x20000000) offset += 4; // SRID present
  if ((type & 0xffff) !== 1) throw new Error("Geometría no soportada: se esperaba un punto");
  return {
    lng: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  };
}

/** geometry(Point, 4326) stored as WGS84 longitude/latitude. */
export const point4326 = customType<{ data: LngLat; driverData: string }>({
  dataType: () => "geometry(Point,4326)",
  toDriver: ({ lng, lat }) => `SRID=4326;POINT(${lng} ${lat})`,
  fromDriver: (value) => parseWkbPoint(value),
});

/** geometry(MultiPolygon, 4326); written from GeoJSON via ST_GeomFromGeoJSON in raw SQL. */
export const multiPolygon4326 = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(MultiPolygon,4326)",
});
