import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  // Extensions must exist before the generated migrations reference geometry / trigram ops.
  await client`create extension if not exists postgis`;
  await client`create extension if not exists pg_trgm`;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("✔ Migraciones aplicadas");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
