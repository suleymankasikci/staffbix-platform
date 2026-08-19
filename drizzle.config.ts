import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Allow generation to run without a live DB.
  // Migrations and push commands will still fail loudly if DATABASE_URL is unset
  // at runtime, which is the behavior we want.
}

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/placeholder",
  },
  strict: true,
  verbose: true,
});
