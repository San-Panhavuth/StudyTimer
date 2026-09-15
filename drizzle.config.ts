import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Mirrors Next.js's own env precedence: base config in .env.local,
// optionally overridden per-environment by .env.<env>.local.
config({ path: ".env.local" });
config({ path: `.env.${process.env.NODE_ENV ?? "development"}.local`, override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (see README for local vs hosted values).");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Supabase manages its own built-in roles (anon, authenticated, service_role, ...) —
  // this keeps drizzle-kit from trying to diff/drop them.
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
