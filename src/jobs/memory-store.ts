import type { EnqueueInput, Job, JobStore } from "./types";

interface Row extends Job {
  status: "queued" | "running" | "succeeded" | "dead";
  runAt: Date;
  dedupeKey?: string;
  lastError?: string;
}

/** In-memory JobStore for unit tests. Mirrors the SQL queue's behaviour. */
export class MemoryJobStore implements JobStore {
  readonly rows: Row[] = [];
  private nextId = 1;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async enqueue(input: EnqueueInput): Promise<string> {
    if (input.dedupeKey) {
      const existing = this.rows.find((r) => r.dedupeKey === input.dedupeKey);
      if (existing) return existing.id;
    }
    const row: Row = {
      id: String(this.nextId++),
      kind: input.kind,
      payload: input.payload ?? {},
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
      status: "queued",
      runAt: input.runAt ?? this.now(),
      dedupeKey: input.dedupeKey,
    };
    this.rows.push(row);
    return row.id;
  }

  async claim(_workerId: string, limit: number): Promise<Job[]> {
    const due = this.rows
      .filter((r) => r.status === "queued" && r.runAt.getTime() <= this.now().getTime())
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime())
      .slice(0, limit);
    for (const row of due) {
      row.status = "running";
      row.attempts += 1;
    }
    return due.map(({ id, kind, payload, attempts, maxAttempts }) => ({
      id,
      kind,
      payload,
      attempts,
      maxAttempts,
    }));
  }

  async complete(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id && r.status === "running");
    if (row) row.status = "succeeded";
  }

  async fail(id: string, error: string, retryInSeconds: number): Promise<"queued" | "dead"> {
    const row = this.rows.find((r) => r.id === id && r.status === "running");
    if (!row) throw new Error(`Job ${id} is not running`);
    row.lastError = error;
    if (row.attempts >= row.maxAttempts) {
      row.status = "dead";
    } else {
      row.status = "queued";
      row.runAt = new Date(this.now().getTime() + retryInSeconds * 1000);
    }
    return row.status;
  }
}
