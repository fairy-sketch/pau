import type { JobHandlers, JobStore, RecurringJob } from "./types";

export interface RunResult {
  claimed: number;
  succeeded: number;
  retried: number;
  dead: number;
}

/** Exponential backoff: 30 s, 1 min, 2 min … capped at one hour. */
export function retryDelaySeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(attempts - 1, 0), 3600);
}

/** Claim due jobs once and run them. One failing job never stops the others. */
export async function runOnce(options: {
  store: JobStore;
  handlers: JobHandlers;
  workerId: string;
  limit?: number;
  now?: () => Date;
  log?: (message: string) => void;
}): Promise<RunResult> {
  const { store, handlers, workerId, limit = 10 } = options;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});

  const jobs = await store.claim(workerId, limit);
  const result: RunResult = { claimed: jobs.length, succeeded: 0, retried: 0, dead: 0 };

  for (const job of jobs) {
    try {
      const handler = handlers[job.kind];
      if (!handler) throw new Error(`No handler registered for job kind "${job.kind}"`);
      await handler(job, { store, now: now(), log });
      await store.complete(job.id);
      result.succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = await store.fail(job.id, message, retryDelaySeconds(job.attempts));
      if (status === "dead") result.dead += 1;
      else result.retried += 1;
      log(`job ${job.kind} ${job.id} failed (attempt ${job.attempts}): ${message}`);
    }
  }

  return result;
}

/** Start of the time slot `now` falls in, for a job that runs every `everyMinutes`. */
export function slotStart(now: Date, everyMinutes: number): Date {
  const slotMs = everyMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / slotMs) * slotMs);
}

/**
 * Enqueue each recurring job for the current time slot. Safe to call as often
 * as you like and from several workers: the dedupe key allows one job per slot.
 */
export async function enqueueRecurring(
  store: JobStore,
  recurring: RecurringJob[],
  now: Date,
): Promise<void> {
  for (const job of recurring) {
    const slot = slotStart(now, job.everyMinutes);
    await store.enqueue({
      kind: job.kind,
      payload: job.payload,
      runAt: slot,
      dedupeKey: `${job.kind}@${slot.toISOString()}`,
    });
  }
}
