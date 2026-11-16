import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/**
 * A throwaway in-process Postgres with every migration applied, so SQL can be
 * tested without Docker. It creates the API roles Supabase provides (anon,
 * authenticated, service_role) because migrations reference them.
 *
 * This checks plain SQL logic. RLS behaviour that depends on Supabase Auth is
 * tested against the real local stack from M1 on.
 */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `);
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (file.endsWith(".sql")) await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}
