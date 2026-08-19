import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Migration runner. Invoked by `npm run db:migrate` locally and by the
 * Railway pre-deploy hook on every release.
 *
 * Drizzle-Kit generates SQL files into ./drizzle from the TS schema;
 * this script just plays them back in order. The migration table is
 * tracked in the `drizzle.__drizzle_migrations` schema.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
