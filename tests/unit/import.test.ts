import { describe, expect, it } from "vitest";

import { canonicalColumn, parseCsv, toCsv, validateRecords } from "@/lib/import/columns";
import { findDuplicate, nameSimilarity } from "@/lib/import/dedupe";

describe("CSV import", () => {
  it("accepts Spanish or English headers, ; separators and accents", () => {
    const csv =
      "﻿Nombre;Categoría;Municipio;Lat;Lng;Teléfono;Instagram;Vía principal\n" +
      "Café La Neblina;cafes;Libertador;8,59;-71,15;0414-1234567;https://instagram.com/cafe.neblina;sí\n";
    const rows = validateRecords(parseCsv(csv));
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.ok).toBe(true);
    if (!row.ok) return;
    expect(row.data).toMatchObject({
      nombre: "Café La Neblina",
      categoria: "cafes",
      municipio: "Libertador",
      latitud: 8.59,
      longitud: -71.15,
      instagram: "cafe.neblina",
      via_principal: true,
      menu_digital: null,
    });
  });

  it("reports errors per line without stopping the import", () => {
    const rows = validateRecords([
      { nombre: "", categoria: "cafes" },
      { nombre: "Ok", categoria: "cafes", latitud: "8.5" },
      { nombre: "Bien", categoria: "bares" },
    ]);
    expect(rows.map((r) => r.ok)).toEqual([false, false, true]);
    expect(rows[0]).toMatchObject({ line: 2 });
    if (!rows[1]!.ok) expect(rows[1]!.errors.join()).toMatch(/juntas/);
  });

  it("maps header aliases", () => {
    expect(canonicalColumn("Teléfono")).toBe("telefono");
    expect(canonicalColumn("latitude")).toBe("latitud");
    expect(canonicalColumn("columna rara")).toBeNull();
  });

  it("exports with a BOM so Excel shows accents", () => {
    expect(toCsv([{ nombre: "Mérida" }]).startsWith("﻿nombre")).toBe(true);
  });
});

describe("duplicate detection", () => {
  const existing = [
    {
      id: 1,
      name: "Restaurante El Trapiche",
      instagram: "eltrapiche",
      phone: "0274-2441234",
      location: { lat: 8.5467, lng: -71.24 },
    },
    {
      id: 2,
      name: "Café La Neblina",
      googlePlaceId: "ChIJ1",
      location: { lat: 8.59, lng: -71.15 },
    },
  ];

  it("matches by Instagram regardless of case", () => {
    expect(findDuplicate({ name: "Otro", instagram: "ElTrapiche" }, existing)).toMatchObject({
      id: 1,
      confidence: "exact",
    });
  });

  it("matches by normalised phone", () => {
    expect(findDuplicate({ name: "Otro", whatsapp: "+58 274 244 1234" }, existing)).toMatchObject({
      id: 1,
      confidence: "exact",
    });
  });

  it("matches by Google place id", () => {
    expect(findDuplicate({ name: "x", googlePlaceId: "ChIJ1" }, existing)?.id).toBe(2);
  });

  it("matches a similar name within 100 m", () => {
    expect(
      findDuplicate({ name: "El Trapiche", location: { lat: 8.5468, lng: -71.2401 } }, existing),
    ).toMatchObject({
      id: 1,
      confidence: "likely",
    });
  });

  it("does not match the same name far away, or a different name nearby", () => {
    expect(
      findDuplicate({ name: "El Trapiche", location: { lat: 8.6, lng: -71.3 } }, existing),
    ).toBeNull();
    expect(
      findDuplicate(
        { name: "Ferretería Central", location: { lat: 8.5467, lng: -71.24 } },
        existing,
      ),
    ).toBeNull();
  });

  it("name similarity ignores generic words and accents", () => {
    expect(nameSimilarity("Restaurante El Trapiche", "el trapiche")).toBe(1);
    expect(nameSimilarity("Café Neblina", "Cafe Neblina")).toBe(1);
    expect(nameSimilarity("Neblina", "Tornillo")).toBeLessThan(0.3);
  });
});
