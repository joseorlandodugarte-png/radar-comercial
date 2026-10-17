import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida. Copia .env.example a .env.");
  }
  return postgres(url, { max: 10, prepare: false });
}

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

export const pgClient = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = pgClient;

export const db = drizzle(pgClient, { schema, casing: "snake_case" });
export type Db = typeof db;
