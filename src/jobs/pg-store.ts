import type { EnqueueInput, Job, JobStore } from "./types";

/**
 * The slice of a Postgres client the store needs. `pg`'s Pool and Client fit,
 * and so does PGlite, which the tests use to run the real SQL without Docker.
 */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

interface JobRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

/** JobStore backed by the SQL functions in supabase/migrations (job queue). */
export class PgJobStore implements JobStore {
  constructor(private readonly db: Queryable) {}

  async enqueue(input: EnqueueInput): Promise<string> {
    const { rows } = await this.db.query(
      "select public.enqueue_job($1, $2::jsonb, $3::timestamptz, $4, $5) as id",
      [
        input.kind,
        JSON.stringify(input.payload ?? {}),
        (input.runAt ?? new Date()).toISOString(),
        input.dedupeKey ?? null,
        input.maxAttempts ?? 5,
      ],
    );
    return (rows[0] as { id: string }).id;
  }

  async claim(workerId: string, limit: number): Promise<Job[]> {
    const { rows } = await this.db.query(
      "select id, kind, payload, attempts, max_attempts from public.claim_jobs($1, $2)",
      [workerId, limit],
    );
    return (rows as JobRow[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      payload: row.payload,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
    }));
  }

  async complete(id: string): Promise<void> {
    await this.db.query("select public.complete_job($1)", [id]);
  }

  async fail(id: string, error: string, retryInSeconds: number): Promise<"queued" | "dead"> {
    const { rows } = await this.db.query(
      "select public.fail_job($1, $2, make_interval(secs => $3)) as status",
      [id, error, retryInSeconds],
    );
    const status = (rows[0] as { status: string | null } | undefined)?.status;
    if (status !== "queued" && status !== "dead") throw new Error(`Job ${id} is not running`);
    return status;
  }
}
