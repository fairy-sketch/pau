import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgJobStore } from "@/src/jobs/pg-store";
import { enqueueRecurring, runOnce } from "@/src/jobs/runner";
import { createTestDb } from "../helpers/db";

let db: PGlite;
let store: PgJobStore;

beforeAll(async () => {
  db = await createTestDb();
  store = new PgJobStore(db);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec("delete from public.job");
});

async function statusOf(id: string) {
  const { rows } = await db.query<{ status: string; attempts: number; last_error: string | null }>(
    "select status, attempts, last_error from public.job where id = $1",
    [id],
  );
  return rows[0];
}

describe("job queue (SQL migration)", () => {
  it("applies the migrations and runs a job end to end", async () => {
    const id = await store.enqueue({ kind: "test.ok", payload: { n: 1 } });
    const seen: unknown[] = [];
    const result = await runOnce({
      store,
      workerId: "w1",
      handlers: {
        "test.ok": async (job) => {
          seen.push(job.payload);
        },
      },
    });
    expect(result).toEqual({ claimed: 1, succeeded: 1, retried: 0, dead: 0 });
    expect(seen).toEqual([{ n: 1 }]);
    expect((await statusOf(id))?.status).toBe("succeeded");
  });

  it("enqueues once per dedupe key", async () => {
    const a = await store.enqueue({ kind: "test.ok", dedupeKey: "slot-1" });
    const b = await store.enqueue({ kind: "test.ok", dedupeKey: "slot-1" });
    expect(b).toBe(a);
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.job");
    expect(rows[0]?.n).toBe(1);
  });

  it("never hands the same job to two workers", async () => {
    await store.enqueue({ kind: "test.ok" });
    const first = await store.claim("w1", 10);
    const second = await store.claim("w2", 10);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("does not claim jobs scheduled for later", async () => {
    await store.enqueue({ kind: "test.ok", runAt: new Date(Date.now() + 3_600_000) });
    expect(await store.claim("w1", 10)).toHaveLength(0);
  });

  it("retries a failing job, then marks it dead at max attempts", async () => {
    const id = await store.enqueue({ kind: "test.fail", maxAttempts: 2 });
    const handlers = {
      "test.fail": async () => {
        throw new Error("boom");
      },
    };

    const first = await runOnce({ store, workerId: "w1", handlers });
    expect(first).toMatchObject({ claimed: 1, retried: 1, dead: 0 });
    expect(await statusOf(id)).toMatchObject({ status: "queued", attempts: 1, last_error: "boom" });

    // The retry is scheduled in the future; pull it forward to run it now.
    await db.query("update public.job set run_at = now() where id = $1", [id]);
    const second = await runOnce({ store, workerId: "w1", handlers });
    expect(second).toMatchObject({ claimed: 1, retried: 0, dead: 1 });
    expect(await statusOf(id)).toMatchObject({ status: "dead", attempts: 2 });
  });

  it("reclaims a job whose worker died", async () => {
    const id = await store.enqueue({ kind: "test.ok" });
    await store.claim("crashed", 1);
    await db.query(
      "update public.job set locked_at = now() - interval '11 minutes' where id = $1",
      [id],
    );
    const again = await store.claim("w2", 1);
    expect(again.map((j) => j.id)).toEqual([id]);
    expect(again[0]?.attempts).toBe(2);
  });

  it("enqueues a recurring job once per time slot", async () => {
    const now = new Date("2026-11-16T18:42:10Z");
    const recurring = [{ kind: "system.heartbeat", everyMinutes: 5 }];
    await enqueueRecurring(store, recurring, now);
    await enqueueRecurring(store, recurring, new Date("2026-11-16T18:44:59Z"));
    await enqueueRecurring(store, recurring, new Date("2026-11-16T18:45:00Z"));
    const { rows } = await db.query<{ dedupe_key: string }>(
      "select dedupe_key from public.job order by run_at",
    );
    expect(rows.map((r) => r.dedupe_key)).toEqual([
      "system.heartbeat@2026-11-16T18:40:00.000Z",
      "system.heartbeat@2026-11-16T18:45:00.000Z",
    ]);
  });

  it("keeps the queue away from API roles", async () => {
    const { rows } = await db.query<{ role: string; can_read: boolean; can_run: boolean }>(`
      select r as role,
             has_table_privilege(r, 'public.job', 'select') as can_read,
             has_function_privilege(r, 'public.claim_jobs(text, integer, interval)', 'execute') as can_run
        from unnest(array['anon', 'authenticated']) as r
    `);
    expect(rows).toEqual([
      { role: "anon", can_read: false, can_run: false },
      { role: "authenticated", can_read: false, can_run: false },
    ]);
    const rls = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid = 'public.job'::regclass",
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
  });
});
