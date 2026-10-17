import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://radar:radar@localhost:5432/radar" },
  extensionsFilters: ["postgis"],
  strict: true,
});
