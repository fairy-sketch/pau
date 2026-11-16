export interface Job {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  /** Number of attempts including the current one. */
  attempts: number;
  maxAttempts: number;
}

export interface EnqueueInput {
  kind: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  /** Makes enqueueing idempotent: the same key never creates a second job. */
  dedupeKey?: string;
  maxAttempts?: number;
}

/**
 * Where jobs live. The worker only knows this interface, so the queue can be
 * swapped (Postgres today; pg_cron, a hosted queue or anything else later).
 */
export interface JobStore {
  enqueue(input: EnqueueInput): Promise<string>;
  claim(workerId: string, limit: number): Promise<Job[]>;
  complete(id: string): Promise<void>;
  /** Returns the job's status after the failure: "queued" (will retry) or "dead". */
  fail(id: string, error: string, retryInSeconds: number): Promise<"queued" | "dead">;
}

export interface JobContext {
  store: JobStore;
  now: Date;
  log: (message: string) => void;
}

export type JobHandler = (job: Job, ctx: JobContext) => Promise<void>;

export type JobHandlers = Record<string, JobHandler>;

/** A job kind that should be enqueued every `everyMinutes`. */
export interface RecurringJob {
  kind: string;
  everyMinutes: number;
  payload?: Record<string, unknown>;
}
