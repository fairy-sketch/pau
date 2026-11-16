/**
 * Background worker. `pnpm jobs:work` loops; `pnpm jobs:once` runs one pass
 * (useful from cron or in tests). Needs the local database (`pnpm db:start`).
 */
import { hostname } from "node:os";
import pg from "pg";
import { PgJobStore } from "../src/jobs/pg-store";
import { handlers, recurring } from "../src/jobs/registry";
import { enqueueRecurring, runOnce } from "../src/jobs/runner";
import { parseServerEnv } from "../src/server/env";

const env = parseServerEnv(process.env);
const once = process.argv.includes("--once");
const workerId = `${hostname()}:${process.pid}`;
const log = (message: string) => console.log(`[jobs] ${message}`);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2 });
const store = new PgJobStore(pool);

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

async function pass(): Promise<void> {
  await enqueueRecurring(store, recurring, new Date());
  const result = await runOnce({ store, handlers, workerId, log });
  if (result.claimed > 0) {
    log(
      `claimed ${result.claimed}, succeeded ${result.succeeded}, retried ${result.retried}, dead ${result.dead}`,
    );
  }
}

async function main(): Promise<void> {
  log(`worker ${workerId} started${once ? " (single pass)" : ""}`);
  do {
    try {
      await pass();
    } catch (error) {
      log(`pass failed: ${error instanceof Error ? error.message : String(error)}`);
      if (once) process.exitCode = 1;
    }
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, env.JOBS_POLL_SECONDS * 1000));
  } while (!stopping);
  await pool.end();
  log("worker stopped");
}

void main();
