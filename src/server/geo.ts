import "server-only";

import { db } from "@/db/client";
import { municipalityForPoint as forPoint } from "@/db/geo-queries";

export function municipalityForPoint(stateId: number, lng: number, lat: number) {
  return forPoint(db, stateId, lng, lat);
}
