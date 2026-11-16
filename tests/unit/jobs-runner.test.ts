import { describe, expect, it } from "vitest";
import { MemoryJobStore } from "@/src/jobs/memory-store";
import { handlers, recurring } from "@/src/jobs/registry";
import { enqueueRecurring, retryDelaySeconds, runOnce, slotStart } from "@/src/jobs/runner";

describe("job runner", () => {
  it("runs the registered heartbeat", async () => {
    const now = new Date("2026-11-16T18:42:00Z");
    const store = new MemoryJobStore(() => now);
    await enqueueRecurring(store, recurring, now);
    const logs: string[] = [];
    const result = await runOnce({
      store,
      handlers,
      workerId: "test",
      now: () => now,
      log: (m) => logs.push(m),
    });
    expect(result).toEqual({ claimed: 1, succeeded: 1, retried: 0, dead: 0 });
    expect(logs).toEqual(["heartbeat 2026-11-16T18:42:00.000Z"]);
  });

  it("fails a job with no handler instead of crashing the pass", async () => {
    const store = new MemoryJobStore();
    await store.enqueue({ kind: "unknown.kind" });
    await store.enqueue({ kind: "system.heartbeat" });
    const result = await runOnce({ store, handlers, workerId: "test" });
    expect(result).toEqual({ claimed: 2, succeeded: 1, retried: 1, dead: 0 });
    expect(store.rows[0]?.lastError).toContain("No handler registered");
  });

  it("backs off exponentially up to one hour", () => {
    expect([1, 2, 3, 4].map(retryDelaySeconds)).toEqual([30, 60, 120, 240]);
    expect(retryDelaySeconds(20)).toBe(3600);
  });

  it("aligns recurring jobs to their time slot", () => {
    expect(slotStart(new Date("2026-11-16T18:44:59Z"), 5).toISOString()).toBe(
      "2026-11-16T18:40:00.000Z",
    );
  });
});
