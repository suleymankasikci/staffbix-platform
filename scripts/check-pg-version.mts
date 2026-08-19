import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  const [{ version }] = await sql<{ version: string }[]>`SELECT version()`;
  console.log(version);
} finally {
  await sql.end();
}
